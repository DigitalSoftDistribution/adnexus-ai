// @ts-nocheck — unported worker; blocked by: (1) path aliases @/lib/logger and @/config not yet configured in tsconfig, (2) config.openai property does not exist in config type, (3) Prisma generated client types not available (creativePerformance, adDailyMetric, alert, creativeDraft, creativeRefreshRecommendation), (4) simple-statistics linearRegression return type requires explicit annotation
/**
 * Creative Fatigue Detection Worker
 *
 * Analyzes creative performance across all workspaces on a 6-hour cadence.
 * Detects ad fatigue via weighted composite scoring (CTR decay, frequency growth,
 * conversion-rate decline), issues alerts, generates AI refresh recommendations,
 * and creates creative drafts when critical thresholds are crossed.
 */

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { linearRegression } from 'simple-statistics';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { EventEmitter } from 'events';
import logger from '@/lib/logger';
import { config } from '@/config';

// ─── Constants ────────────────────────────────────────────────────────────────

const ANALYSIS_WINDOW_DAYS = 14;
const CRITICAL_THRESHOLD = 80;
const WARNING_THRESHOLD = 60;
const HEALTHY_MAX = 60;

const WEIGHT_CTR_DECAY = 0.40;
const WEIGHT_FREQUENCY_GROWTH = 0.35;
const WEIGHT_CONVERSION_DECLINE = 0.25;

const QUEUE_NAME = 'fatigue-detection';
const JOB_NAME = 'detect-fatigue';
const PROCESSOR_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BACKOFF_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendResult {
  slope: number;
  intercept: number;
  r2: number;
  trend: 'improving' | 'stable' | 'declining';
  values: Array<{ date: string; value: number }>;
}

export interface FatigueResult {
  adId: string;
  workspaceId: string;
  score: number;
  severity: 'healthy' | 'warning' | 'critical';
  ctrTrend: TrendResult;
  frequencyTrend: TrendResult;
  conversionTrend: TrendResult;
  recommendation?: CreativeRefreshRecommendation;
  alertId?: string;
  draftId?: string;
}

export interface CreativeRefreshRecommendation {
  headline: string;
  body: string;
  callToAction: string;
  imageDescription: string;
  reasoning: string;
  confidence: number;
}

export interface AdPerformanceMetrics {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  reach: number;
  frequency: number;
}

export interface Ad {
  id: string;
  workspaceId: string;
  name: string;
  creativeType: string;
  campaignId: string;
  externalAdId?: string;
  performanceMetrics?: AdPerformanceMetrics[];
}

// ─── FatigueDetectionWorker ───────────────────────────────────────────────────

export class FatigueDetectionWorker {
  private prisma: PrismaClient;
  private redis: Redis;
  private openai: OpenAI;
  private eventBus: EventEmitter;
  private queue: Queue;
  private worker: Worker | null = null;
  private isShuttingDown = false;

  constructor(deps: {
    prisma?: PrismaClient;
    redis?: Redis;
    openai?: OpenAI;
    eventBus?: EventEmitter;
  } = {}) {
    this.prisma = deps.prisma || new PrismaClient();
    this.redis =
      deps.redis ||
      new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });
    this.openai =
      deps.openai ||
      new OpenAI({ apiKey: config.openai.apiKey });
    this.eventBus = deps.eventBus || new EventEmitter();
    this.queue = new Queue(QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: { type: 'exponential', delay: BACKOFF_MS },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Start the BullMQ worker to consume fatigue-detection jobs.
   */
  start(): void {
    if (this.worker) {
      logger.warn('[FatigueDetectionWorker] Already running');
      return;
    }

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<{ workspaceId?: string }>) => {
        logger.info(
          `[FatigueDetectionWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
        );

        const { workspaceId } = job.data;

        if (workspaceId) {
          await this.detectForWorkspace(workspaceId);
        } else {
          // Run for all active workspaces
          const workspaces = await this.fetchActiveWorkspaces();
          logger.info(
            `[FatigueDetectionWorker] Scanning ${workspaces.length} workspaces`
          );

          for (const ws of workspaces) {
            await job.moveToDelayed(Date.now() + 500);
            await this.detectForWorkspace(ws.id);
            await job.updateProgress(
              Math.round(((workspaces.indexOf(ws) + 1) / workspaces.length) * 100)
            );
          }
        }

        logger.info(`[FatigueDetectionWorker] Job ${job.id} completed`);
      },
      {
        connection: this.redis,
        concurrency: PROCESSOR_CONCURRENCY,
        lockDuration: 30_000,
        stalledInterval: 30_000,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`[FatigueDetectionWorker] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(
        `[FatigueDetectionWorker] Job ${job?.id} failed: ${err.message}`,
        err
      );
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`[FatigueDetectionWorker] Job ${jobId} stalled`);
    });

    logger.info('[FatigueDetectionWorker] Worker started');
  }

  /**
   * Schedule a recurring fatigue-detection job.
   */
  async scheduleRecurring(): Promise<void> {
    await this.queue.add(
      JOB_NAME,
      {},
      {
        repeat: { every: 6 * 60 * 60 * 1000 }, // Every 6 hours
        jobId: 'fatigue-detection-recurring',
      }
    );
    logger.info('[FatigueDetectionWorker] Recurring job scheduled (every 6h)');
  }

  /**
   * Gracefully shut down the worker and queue.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('[FatigueDetectionWorker] Shutting down...');

    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.queue.close();
    await this.prisma.$disconnect();
    this.redis.disconnect();

    logger.info('[FatigueDetectionWorker] Shutdown complete');
  }

  // ─── Core Detection Orchestrator ──────────────────────────────────────────

  /**
   * Run fatigue detection for every active ad in a workspace.
   */
  async detectForWorkspace(workspaceId: string): Promise<FatigueResult[]> {
    logger.info(`[FatigueDetectionWorker] Detecting fatigue for workspace ${workspaceId}`);

    const ads = await this.fetchActiveAdsForWorkspace(workspaceId);
    const results: FatigueResult[] = [];

    for (const ad of ads) {
      try {
        const score = await this.calculateFatigueScore(ad.id, ANALYSIS_WINDOW_DAYS);
        const severity = this.classifySeverity(score);

        const result: FatigueResult = {
          adId: ad.id,
          workspaceId,
          score,
          severity,
          ctrTrend: await this.analyzeCTRTrend(ad.id, ANALYSIS_WINDOW_DAYS),
          frequencyTrend: await this.analyzeFrequencyGrowth(ad.id, ANALYSIS_WINDOW_DAYS),
          conversionTrend: await this.analyzeConversionRateDecline(ad.id, ANALYSIS_WINDOW_DAYS),
        };

        // Persist creative performance record
        await this.upsertCreativePerformance(ad.id, result);

        // Handle fatigued ads (warning or critical)
        if (severity === 'critical' || severity === 'warning') {
          await this.handleFatiguedAd(ad, score, result);
        }

        // Publish real-time event
        await this.publishFatigueEvent(result);

        results.push(result);
      } catch (err) {
        logger.error(
          `[FatigueDetectionWorker] Error analyzing ad ${ad.id}: ${(err as Error).message}`,
          err
        );
        // Continue with next ad — don't fail the whole workspace
      }
    }

    // Publish workspace-level summary event
    await this.publishWorkspaceSummary(workspaceId, results);

    logger.info(
      `[FatigueDetectionWorker] Workspace ${workspaceId}: ${results.length} ads analyzed, ` +
        `${results.filter((r) => r.severity === 'critical').length} critical, ` +
        `${results.filter((r) => r.severity === 'warning').length} warning`
    );

    return results;
  }

  /**
   * Calculate the composite fatigue score (0–100).
   */
  async calculateFatigueScore(adId: string, days: number): Promise<number> {
    const ctrResult = await this.analyzeCTRTrend(adId, days);
    const freqResult = await this.analyzeFrequencyGrowth(adId, days);
    const convResult = await this.analyzeConversionRateDecline(adId, days);

    // Normalize each component to 0-100 (higher = more fatigued)
    const ctrScore = this.normalizeCTRDecay(ctrResult);
    const freqScore = this.normalizeFrequencyGrowth(freqResult);
    const convScore = this.normalizeConversionDecline(convResult);

    const composite =
      ctrScore * WEIGHT_CTR_DECAY +
      freqScore * WEIGHT_FREQUENCY_GROWTH +
      convScore * WEIGHT_CONVERSION_DECLINE;

    return Math.round(Math.min(100, Math.max(0, composite)));
  }

  // ─── Trend Analysis Methods ───────────────────────────────────────────────

  /**
   * Analyze CTR trend over N days using linear regression.
   */
  async analyzeCTRTrend(adId: string, days: number): Promise<TrendResult> {
    const metrics = await this.fetchDailyMetrics(adId, days);

    const points = metrics
      .filter((m) => m.impressions > 0)
      .map((m, index) => ({
        date: m.date.toISOString().split('T')[0],
        x: index,
        value: (m.clicks / m.impressions) * 100, // CTR %
      }));

    if (points.length < 3) {
      return { slope: 0, intercept: 0, r2: 0, trend: 'stable', values: [] };
    }

    const regression = linearRegression(
      points.map((p) => [p.x, p.value])
    );
    const r2 = this.calculateR2(
      points.map((p) => p.x),
      points.map((p) => p.value),
      regression.m,
      regression.b
    );

    const slope = regression.m;
    const trend: TrendResult['trend'] =
      slope < -0.05 ? 'declining' : slope > 0.02 ? 'improving' : 'stable';

    return {
      slope,
      intercept: regression.b,
      r2,
      trend,
      values: points.map((p) => ({ date: p.date, value: p.value })),
    };
  }

  /**
   * Analyze frequency growth trend over N days.
   */
  async analyzeFrequencyGrowth(adId: string, days: number): Promise<TrendResult> {
    const metrics = await this.fetchDailyMetrics(adId, days);

    const points = metrics
      .filter((m) => m.reach > 0)
      .map((m, index) => ({
        date: m.date.toISOString().split('T')[0],
        x: index,
        value: m.frequency,
      }));

    if (points.length < 3) {
      return { slope: 0, intercept: 0, r2: 0, trend: 'stable', values: [] };
    }

    const regression = linearRegression(
      points.map((p) => [p.x, p.value])
    );
    const r2 = this.calculateR2(
      points.map((p) => p.x),
      points.map((p) => p.value),
      regression.m,
      regression.b
    );

    const slope = regression.m;
    const trend: TrendResult['trend'] =
      slope > 0.03 ? 'declining' : slope < -0.01 ? 'improving' : 'stable';
    // Frequency growth = declining performance (more repetition per user)

    return {
      slope,
      intercept: regression.b,
      r2,
      trend,
      values: points.map((p) => ({ date: p.date, value: p.value })),
    };
  }

  /**
   * Analyze conversion-rate decline trend over N days.
   */
  async analyzeConversionRateDecline(
    adId: string,
    days: number
  ): Promise<TrendResult> {
    const metrics = await this.fetchDailyMetrics(adId, days);

    const points = metrics
      .filter((m) => m.clicks > 0)
      .map((m, index) => ({
        date: m.date.toISOString().split('T')[0],
        x: index,
        value: (m.conversions / m.clicks) * 100, // CVR %
      }));

    if (points.length < 3) {
      return { slope: 0, intercept: 0, r2: 0, trend: 'stable', values: [] };
    }

    const regression = linearRegression(
      points.map((p) => [p.x, p.value])
    );
    const r2 = this.calculateR2(
      points.map((p) => p.x),
      points.map((p) => p.value),
      regression.m,
      regression.b
    );

    const slope = regression.m;
    const trend: TrendResult['trend'] =
      slope < -0.03 ? 'declining' : slope > 0.01 ? 'improving' : 'stable';

    return {
      slope,
      intercept: regression.b,
      r2,
      trend,
      values: points.map((p) => ({ date: p.date, value: p.value })),
    };
  }

  // ─── Fatigued Ad Handling ─────────────────────────────────────────────────

  /**
   * Handle an ad that has crossed fatigue thresholds:
   *  - Create alert notification
   *  - Generate AI refresh recommendation
   *  - Create draft for creative refresh (critical only)
   */
  async handleFatiguedAd(
    ad: Ad,
    score: number,
    result: FatigueResult
  ): Promise<void> {
    const isCritical = score >= CRITICAL_THRESHOLD;

    // 1. Create alert notification
    const alertId = await this.createAlert(ad, score, result);
    result.alertId = alertId;

    // 2. Generate AI-powered creative refresh recommendation
    const recommendation = await this.generateAIRecommendation(ad, score, result);
    result.recommendation = recommendation;

    // Persist recommendation
    await this.prisma.creativeRefreshRecommendation.create({
      data: {
        adId: ad.id,
        workspaceId: ad.workspaceId,
        headline: recommendation.headline,
        body: recommendation.body,
        callToAction: recommendation.callToAction,
        imageDescription: recommendation.imageDescription,
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidence,
        score,
        createdAt: new Date(),
      },
    });

    // 3. Create draft for creative refresh if critical
    if (isCritical) {
      const draftId = await this.createCreativeRefreshDraft(ad, recommendation, score);
      result.draftId = draftId;
    }

    logger.info(
      `[FatigueDetectionWorker] Handled fatigued ad ${ad.id} ` +
        `(score=${score}, severity=${isCritical ? 'critical' : 'warning'})`
    );
  }

  /**
   * Generate an AI-powered creative refresh recommendation.
   */
  async generateAIRecommendation(
    ad: Ad,
    score: number,
    result: FatigueResult
  ): Promise<CreativeRefreshRecommendation> {
    const prompt = `
You are an expert digital advertising creative strategist.
Analyze the following ad performance data and generate a creative refresh recommendation.

Ad Name: ${ad.name}
Creative Type: ${ad.creativeType}
Fatigue Score: ${score}/100
Severity: ${score >= CRITICAL_THRESHOLD ? 'CRITICAL' : 'WARNING'}

Performance Trends (last ${ANALYSIS_WINDOW_DAYS} days):
- CTR Trend: ${result.ctrTrend.trend} (slope: ${result.ctrTrend.slope.toFixed(4)})
- Frequency Growth: ${result.frequencyTrend.trend} (slope: ${result.frequencyTrend.slope.toFixed(4)})
- Conversion Rate Trend: ${result.conversionTrend.trend} (slope: ${result.conversionTrend.slope.toFixed(4)})

Provide a JSON response with:
- headline: A new headline suggestion (max 60 chars)
- body: A new body copy suggestion (max 150 chars)
- callToAction: A CTA button text suggestion (max 25 chars)
- imageDescription: A description of the recommended visual refresh
- reasoning: Brief explanation of why this refresh will help (max 200 chars)
- confidence: Number 0-1 indicating your confidence in this recommendation
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a creative strategist for digital advertising. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      return {
        headline: parsed.headline || 'Fresh Headline Here',
        body: parsed.body || 'Compelling new body copy to re-engage your audience.',
        callToAction: parsed.callToAction || 'Learn More',
        imageDescription:
          parsed.imageDescription || 'Updated visual with modern design elements',
        reasoning:
          parsed.reasoning ||
          'Based on declining CTR and rising frequency, a visual and messaging refresh is recommended.',
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
      };
    } catch (err) {
      logger.error(
        `[FatigueDetectionWorker] AI recommendation failed for ad ${ad.id}: ${(err as Error).message}`
      );

      // Fallback recommendation
      return {
        headline: `Refresh: ${ad.name}`,
        body: 'Revamped messaging to combat audience fatigue and re-engage prospects.',
        callToAction: 'Learn More',
        imageDescription: 'Fresh creative with updated color palette and modern visuals',
        reasoning:
          'Ad shows signs of creative fatigue. A refresh with new visuals and messaging is recommended.',
        confidence: 0.6,
      };
    }
  }

  // ─── Data Access ──────────────────────────────────────────────────────────

  private async fetchActiveWorkspaces(): Promise<Array<{ id: string }>> {
    return this.prisma.workspace.findMany({
      where: {
        status: 'active',
        ads: { some: { status: 'active' } },
      },
      select: { id: true },
    });
  }

  private async fetchActiveAdsForWorkspace(workspaceId: string): Promise<Ad[]> {
    const ads = await this.prisma.ad.findMany({
      where: {
        workspaceId,
        status: 'active',
        campaign: { status: { in: ['active', 'running'] } },
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        creativeType: true,
        campaignId: true,
        externalAdId: true,
      },
    });

    return ads;
  }

  private async fetchDailyMetrics(
    adId: string,
    days: number
  ): Promise<AdPerformanceMetrics[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.prisma.adDailyMetric.findMany({
      where: {
        adId,
        date: { gte: cutoff },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        impressions: true,
        clicks: true,
        conversions: true,
        spend: true,
        reach: true,
        frequency: true,
      },
    });
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private async upsertCreativePerformance(
    adId: string,
    result: FatigueResult
  ): Promise<void> {
    await this.prisma.creativePerformance.upsert({
      where: { adId },
      update: {
        fatigueScore: result.score,
        severity: result.severity,
        ctrSlope: result.ctrTrend.slope,
        ctrR2: result.ctrTrend.r2,
        frequencySlope: result.frequencyTrend.slope,
        frequencyR2: result.frequencyTrend.r2,
        conversionSlope: result.conversionTrend.slope,
        conversionR2: result.conversionTrend.r2,
        analyzedAt: new Date(),
      },
      create: {
        adId,
        workspaceId: result.workspaceId,
        fatigueScore: result.score,
        severity: result.severity,
        ctrSlope: result.ctrTrend.slope,
        ctrR2: result.ctrTrend.r2,
        frequencySlope: result.frequencyTrend.slope,
        frequencyR2: result.frequencyTrend.r2,
        conversionSlope: result.conversionTrend.slope,
        conversionR2: result.conversionTrend.r2,
        analyzedAt: new Date(),
      },
    });
  }

  private async createAlert(
    ad: Ad,
    score: number,
    result: FatigueResult
  ): Promise<string> {
    const alert = await this.prisma.alert.create({
      data: {
        workspaceId: ad.workspaceId,
        type: score >= CRITICAL_THRESHOLD ? 'fatigue_critical' : 'fatigue_warning',
        severity: score >= CRITICAL_THRESHOLD ? 'critical' : 'warning',
        title: `Creative Fatigue ${score >= CRITICAL_THRESHOLD ? 'Critical' : 'Warning'}: ${ad.name}`,
        message: `Ad "${ad.name}" has a fatigue score of ${score}/100. CTR is ${result.ctrTrend.trend}, frequency is ${result.frequencyTrend.trend}, conversion rate is ${result.conversionTrend.trend}.`,
        adId: ad.id,
        metadata: {
          score,
          ctrSlope: result.ctrTrend.slope,
          frequencySlope: result.frequencyTrend.slope,
          conversionSlope: result.conversionTrend.slope,
        },
        status: 'open',
        createdAt: new Date(),
      },
    });

    return alert.id;
  }

  private async createCreativeRefreshDraft(
    ad: Ad,
    recommendation: CreativeRefreshRecommendation,
    score: number
  ): Promise<string> {
    const draft = await this.prisma.creativeDraft.create({
      data: {
        workspaceId: ad.workspaceId,
        adId: ad.id,
        name: `${ad.name} - Refresh (fatigue: ${score})`,
        headline: recommendation.headline,
        body: recommendation.body,
        callToAction: recommendation.callToAction,
        imageDescription: recommendation.imageDescription,
        status: 'draft',
        source: 'ai_fatigue_recommendation',
        aiConfidence: recommendation.confidence,
        createdAt: new Date(),
      },
    });

    return draft.id;
  }

  // ─── Event Publishing ─────────────────────────────────────────────────────

  private async publishFatigueEvent(result: FatigueResult): Promise<void> {
    const eventKey = `workspace:${result.workspaceId}:fatigue`;
    const payload = JSON.stringify({
      type: 'creative.fatigue.detected',
      timestamp: new Date().toISOString(),
      data: {
        adId: result.adId,
        score: result.score,
        severity: result.severity,
        ctrTrend: result.ctrTrend.trend,
        frequencyTrend: result.frequencyTrend.trend,
        conversionTrend: result.conversionTrend.trend,
        alertId: result.alertId,
        draftId: result.draftId,
      },
    });

    // Publish via Redis Pub/Sub
    await this.redis.publish(eventKey, payload);

    // Also publish to SSE stream
    this.eventBus.emit('fatigue.detected', result);
  }

  private async publishWorkspaceSummary(
    workspaceId: string,
    results: FatigueResult[]
  ): Promise<void> {
    const critical = results.filter((r) => r.severity === 'critical').length;
    const warning = results.filter((r) => r.severity === 'warning').length;
    const healthy = results.filter((r) => r.severity === 'healthy').length;

    const payload = JSON.stringify({
      type: 'creative.fatigue.summary',
      timestamp: new Date().toISOString(),
      data: {
        workspaceId,
        totalAnalyzed: results.length,
        critical,
        warning,
        healthy,
        averageScore: results.length
          ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
          : 0,
      },
    });

    await this.redis.publish(`workspace:${workspaceId}:fatigue`, payload);
    this.eventBus.emit('fatigue.summary', { workspaceId, critical, warning, healthy });
  }

  // ─── Scoring Helpers ──────────────────────────────────────────────────────

  private classifySeverity(score: number): FatigueResult['severity'] {
    if (score >= CRITICAL_THRESHOLD) return 'critical';
    if (score >= WARNING_THRESHOLD) return 'warning';
    return 'healthy';
  }

  private normalizeCTRDecay(result: TrendResult): number {
    if (result.trend === 'improving') return 0;
    if (result.trend === 'stable') return 30;
    // Declining: map slope from [-0.5, 0] to [30, 100]
    const normalized = Math.min(
      100,
      30 + Math.abs(result.slope) * 140 // scaling factor
    );
    return Math.round(normalized);
  }

  private normalizeFrequencyGrowth(result: TrendResult): number {
    if (result.trend === 'improving') return 0;
    if (result.trend === 'stable') return 25;
    // Growing frequency: map slope from [0, 0.5] to [25, 100]
    const normalized = Math.min(
      100,
      25 + result.slope * 150 // scaling factor
    );
    return Math.round(normalized);
  }

  private normalizeConversionDecline(result: TrendResult): number {
    if (result.trend === 'improving') return 0;
    if (result.trend === 'stable') return 20;
    // Declining: map slope from [-0.3, 0] to [20, 100]
    const normalized = Math.min(
      100,
      20 + Math.abs(result.slope) * 267 // scaling factor
    );
    return Math.round(normalized);
  }

  private calculateR2(
    xValues: number[],
    yValues: number[],
    slope: number,
    intercept: number
  ): number {
    const n = xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let ssTotal = 0;
    let ssResidual = 0;

    for (let i = 0; i < n; i++) {
      const yPred = slope * xValues[i] + intercept;
      ssTotal += Math.pow(yValues[i] - yMean, 2);
      ssResidual += Math.pow(yValues[i] - yPred, 2);
    }

    return ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
  }
}

// ─── Standalone Job Trigger (for manual / cron invocation) ────────────────────

export async function triggerFatigueDetection(
  workspaceId?: string
): Promise<FatigueResult[]> {
  const worker = new FatigueDetectionWorker();
  try {
    return await worker.detectForWorkspace(workspaceId || 'default');
  } finally {
    await worker.shutdown();
  }
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default FatigueDetectionWorker;
