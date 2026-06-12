/**
 * Creative Fatigue Detection Worker
 *
 * Analyzes creative performance across workspaces on a 6-hour cadence.
 * Worker startup is gated by BACKGROUND_JOBS_ENABLED and
 * BACKGROUND_DETECT_FATIGUE_ENABLED (default-off, PR #79 pattern).
 */

import { Worker, Queue, Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { EventEmitter } from 'events';

import { config } from '../config';
import { getRedisClient } from '../lib/redis';
import { getModuleLogger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { createDraft } from '../services/drafts-service';
import { broadcastToWorkspace } from '../services/notification-service';
import type { Platform } from '../types';

const log = getModuleLogger('detect-fatigue');

export const FATIGUE_DETECTION_QUEUE_NAME = 'fatigue-detection';
export const FATIGUE_DETECTION_JOB_NAME = 'detect-fatigue';

export const ANALYSIS_WINDOW_DAYS = 14;
export const CRITICAL_THRESHOLD = 80;
export const WARNING_THRESHOLD = 60;

const WEIGHT_CTR_DECAY = 0.4;
const WEIGHT_FREQUENCY_GROWTH = 0.35;
const WEIGHT_CONVERSION_DECLINE = 0.25;

const PROCESSOR_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BACKOFF_MS = 60_000;
const RECURRING_INTERVAL_MS = 6 * 60 * 60 * 1000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export type DetectFatigueWorkerStatus =
  | 'disabled'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'error';

export interface DetectFatigueWorkerSnapshot {
  status: DetectFatigueWorkerStatus;
  enabled: boolean;
  reason?: string;
  startedAt?: string;
}

export interface TrendResult {
  slope: number;
  intercept: number;
  r2: number;
  trend: 'improving' | 'stable' | 'declining';
  values: Array<{ date: string; value: number }>;
}

export interface CreativeRefreshRecommendation {
  headline: string;
  body: string;
  callToAction: string;
  imageDescription: string;
  reasoning: string;
  confidence: number;
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

export interface AdPerformanceMetrics {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  reach: number;
  frequency: number;
}

export interface FatigueAd {
  id: string;
  workspaceId: string;
  name: string;
  creativeType: string;
  campaignId: string;
  adsetId: string;
  platform: Platform;
  externalAdId?: string;
  frequency: number;
  conversions: number;
}

interface FatigueJobData {
  workspaceId?: string;
}

let workerRedis: Redis | null = null;
let fatigueDetectionQueue: Queue<FatigueJobData> | null = null;
let detectFatigueWorker: Worker<FatigueJobData> | null = null;
let workerSnapshot: DetectFatigueWorkerSnapshot = {
  status: 'disabled',
  enabled: false,
};

function getWorkerRedis(): Redis {
  if (!workerRedis) {
    const client = getRedisClient();
    if (!client) {
      throw new Error('Redis client is not configured');
    }
    workerRedis = client;
  }
  return workerRedis;
}

export function buildFatigueJobId(workspaceId: string, timestamp = Date.now()): string {
  return `fatigue-${workspaceId}-${timestamp}`;
}

export function classifyFatigueSeverity(score: number): FatigueResult['severity'] {
  if (score >= CRITICAL_THRESHOLD) return 'critical';
  if (score >= WARNING_THRESHOLD) return 'warning';
  return 'healthy';
}

export function normalizeCTRDecay(result: TrendResult): number {
  if (result.trend === 'improving') return 0;
  if (result.trend === 'stable') return 30;
  return Math.round(Math.min(100, 30 + Math.abs(result.slope) * 140));
}

export function normalizeFrequencyGrowth(result: TrendResult): number {
  if (result.trend === 'improving') return 0;
  if (result.trend === 'stable') return 25;
  return Math.round(Math.min(100, 25 + result.slope * 150));
}

export function normalizeConversionDecline(result: TrendResult): number {
  if (result.trend === 'improving') return 0;
  if (result.trend === 'stable') return 20;
  return Math.round(Math.min(100, 20 + Math.abs(result.slope) * 267));
}

export function calculateR2(
  xValues: number[],
  yValues: number[],
  slope: number,
  intercept: number,
): number {
  const n = xValues.length;
  if (n === 0) return 0;

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

export function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };

  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.slice(0, n).reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, v) => s + v * v, 0);
  const denom = n * sumXX - sumX * sumX;

  if (denom === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function analyzeMetricTrend(
  points: Array<{ date: string; value: number }>,
  decliningSlope: number,
  improvingSlope: number,
  invertTrend = false,
): TrendResult {
  if (points.length < 3) {
    return { slope: 0, intercept: 0, r2: 0, trend: 'stable', values: [] };
  }

  const xs = points.map((_, index) => index);
  const ys = points.map((point) => point.value);
  const regression = linearRegression(xs, ys);
  const r2 = calculateR2(xs, ys, regression.slope, regression.intercept);

  let trend: TrendResult['trend'] = 'stable';
  if (invertTrend) {
    if (regression.slope > decliningSlope) trend = 'declining';
    else if (regression.slope < improvingSlope) trend = 'improving';
  } else {
    if (regression.slope < decliningSlope) trend = 'declining';
    else if (regression.slope > improvingSlope) trend = 'improving';
  }

  return {
    slope: regression.slope,
    intercept: regression.intercept,
    r2,
    trend,
    values: points,
  };
}

export function calculateCompositeFatigueScore(
  ctrTrend: TrendResult,
  frequencyTrend: TrendResult,
  conversionTrend: TrendResult,
): number {
  const composite =
    normalizeCTRDecay(ctrTrend) * WEIGHT_CTR_DECAY +
    normalizeFrequencyGrowth(frequencyTrend) * WEIGHT_FREQUENCY_GROWTH +
    normalizeConversionDecline(conversionTrend) * WEIGHT_CONVERSION_DECLINE;

  return Math.round(Math.min(100, Math.max(0, composite)));
}

export function getDetectFatigueDisableReason(): string | null {
  if (!config.backgroundJobs.enabled) {
    return 'BACKGROUND_JOBS_ENABLED is not true';
  }
  if (!config.backgroundJobs.detectFatigueEnabled) {
    return 'BACKGROUND_DETECT_FATIGUE_ENABLED is not true';
  }
  if (!config.redis.url) {
    return 'REDIS_URL is not configured';
  }

  const redis = getRedisClient();
  if (!redis || redis.status !== 'ready') {
    return `Redis is not ready: ${redis?.status ?? 'disconnected'}`;
  }

  return null;
}

export function getDetectFatigueWorkerStatus(): DetectFatigueWorkerSnapshot {
  return { ...workerSnapshot };
}

function getFatigueQueue(): Queue<FatigueJobData> {
  if (!fatigueDetectionQueue) {
    fatigueDetectionQueue = new Queue<FatigueJobData>(FATIGUE_DETECTION_QUEUE_NAME, {
      connection: getWorkerRedis(),
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: { type: 'exponential', delay: BACKOFF_MS },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return fatigueDetectionQueue;
}

async function fetchActiveWorkspaces(): Promise<Array<{ id: string }>> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .order('id');

  if (error) {
    log.error({ msg: error.message }, 'fetchActiveWorkspaces failed');
    return [];
  }

  return (data ?? []).map((row) => ({ id: row.id as string }));
}

async function fetchActiveAdsForWorkspace(workspaceId: string): Promise<FatigueAd[]> {
  const { data, error } = await supabase
    .from('ads')
    .select(
      'id, workspace_id, name, creative_type, campaign_id, adset_id, platform, platform_ad_id, frequency, conversions, campaigns!inner(status)',
    )
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .in('campaigns.status', ['active', 'running']);

  if (error) {
    log.error({ workspaceId, msg: error.message }, 'fetchActiveAdsForWorkspace failed');
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    creativeType: (row.creative_type as string | null) ?? 'unknown',
    campaignId: row.campaign_id as string,
    adsetId: row.adset_id as string,
    platform: row.platform as Platform,
    externalAdId: (row.platform_ad_id as string | null) ?? undefined,
    frequency: Number(row.frequency ?? 0),
    conversions: Number(row.conversions ?? 0),
  }));
}

async function fetchDailyMetrics(adId: string, days: number): Promise<AdPerformanceMetrics[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from('creative_performance')
    .select('date, impressions, clicks, ctr')
    .eq('ad_id', adId)
    .gte('date', cutoff.toISOString().slice(0, 10))
    .order('date', { ascending: true });

  if (error) {
    log.warn({ adId, msg: error.message }, 'fetchDailyMetrics failed');
    return [];
  }

  const { data: adRow } = await supabase
    .from('ads')
    .select('frequency, conversions, spend')
    .eq('id', adId)
    .maybeSingle();

  const baseFrequency = Number(adRow?.frequency ?? 0);
  const totalConversions = Number(adRow?.conversions ?? 0);
  const totalSpend = Number(adRow?.spend ?? 0);
  const rowCount = Math.max(1, (data ?? []).length);
  const avgImpressions =
    (data ?? []).reduce((sum, row) => sum + Number(row.impressions ?? 0), 0) / rowCount || 1;

  return (data ?? []).map((row) => {
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const frequencyScale = avgImpressions > 0 ? impressions / avgImpressions : 1;
    const frequency = Math.max(0, baseFrequency * frequencyScale);
    const reach = frequency > 0 ? impressions / frequency : impressions;

    return {
      date: new Date(String(row.date)),
      impressions,
      clicks,
      conversions: totalConversions / rowCount,
      spend: totalSpend / rowCount,
      reach,
      frequency,
    };
  });
}

async function analyzeCTRTrend(adId: string, days: number): Promise<TrendResult> {
  const metrics = await fetchDailyMetrics(adId, days);
  const points = metrics
    .filter((metric) => metric.impressions > 0)
    .map((metric, index) => ({
      date: metric.date.toISOString().split('T')[0],
      x: index,
      value: (metric.clicks / metric.impressions) * 100,
    }));

  return analyzeMetricTrend(
    points.map((point) => ({ date: point.date, value: point.value })),
    -0.05,
    0.02,
  );
}

async function analyzeFrequencyGrowth(adId: string, days: number): Promise<TrendResult> {
  const metrics = await fetchDailyMetrics(adId, days);
  const points = metrics
    .filter((metric) => metric.reach > 0)
    .map((metric, index) => ({
      date: metric.date.toISOString().split('T')[0],
      x: index,
      value: metric.frequency,
    }));

  return analyzeMetricTrend(
    points.map((point) => ({ date: point.date, value: point.value })),
    0.03,
    -0.01,
    true,
  );
}

async function analyzeConversionRateDecline(adId: string, days: number): Promise<TrendResult> {
  const metrics = await fetchDailyMetrics(adId, days);
  const points = metrics
    .filter((metric) => metric.clicks > 0)
    .map((metric, index) => ({
      date: metric.date.toISOString().split('T')[0],
      x: index,
      value: (metric.conversions / metric.clicks) * 100,
    }));

  return analyzeMetricTrend(
    points.map((point) => ({ date: point.date, value: point.value })),
    -0.03,
    0.01,
  );
}

async function calculateFatigueScore(adId: string, days: number): Promise<number> {
  const ctrTrend = await analyzeCTRTrend(adId, days);
  const frequencyTrend = await analyzeFrequencyGrowth(adId, days);
  const conversionTrend = await analyzeConversionRateDecline(adId, days);
  return calculateCompositeFatigueScore(ctrTrend, frequencyTrend, conversionTrend);
}

async function upsertCreativePerformance(adId: string, result: FatigueResult): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const performanceTrend = result.ctrTrend.trend;

  const { error: perfError } = await supabase.from('creative_performance').upsert(
    {
      ad_id: adId,
      date: today,
      fatigue_score: result.score,
      performance_trend: performanceTrend,
    },
    { onConflict: 'ad_id,date' },
  );

  if (perfError) {
    log.warn({ adId, msg: perfError.message }, 'creative_performance upsert failed');
  }

  const fatigueStatus =
    result.severity === 'critical'
      ? 'critical'
      : result.severity === 'warning'
        ? 'warning'
        : 'healthy';

  const { error: adError } = await supabase
    .from('ads')
    .update({
      fatigue_score: result.score,
      fatigue_status: fatigueStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adId);

  if (adError) {
    log.warn({ adId, msg: adError.message }, 'ads fatigue update failed');
  }
}

async function createFatigueAlert(
  ad: FatigueAd,
  score: number,
  result: FatigueResult,
): Promise<string | undefined> {
  const title =
    score >= CRITICAL_THRESHOLD
      ? `Creative Fatigue Critical: ${ad.name}`
      : `Creative Fatigue Warning: ${ad.name}`;

  await broadcastToWorkspace(ad.workspaceId, {
    workspaceId: ad.workspaceId,
    type: 'system',
    title,
    message:
      `Ad "${ad.name}" has a fatigue score of ${score}/100. ` +
      `CTR is ${result.ctrTrend.trend}, frequency is ${result.frequencyTrend.trend}, ` +
      `conversion rate is ${result.conversionTrend.trend}.`,
    data: {
      adId: ad.id,
      score,
      severity: result.severity,
      ctrSlope: result.ctrTrend.slope,
      frequencySlope: result.frequencyTrend.slope,
      conversionSlope: result.conversionTrend.slope,
    },
  });

  return undefined;
}

function buildFallbackRecommendation(ad: FatigueAd, score: number): CreativeRefreshRecommendation {
  return {
    headline: `Refresh: ${ad.name}`,
    body: 'Revamped messaging to combat audience fatigue and re-engage prospects.',
    callToAction: 'Learn More',
    imageDescription: 'Fresh creative with updated color palette and modern visuals',
    reasoning:
      score >= CRITICAL_THRESHOLD
        ? 'Critical fatigue detected. A full creative refresh is recommended immediately.'
        : 'Ad shows signs of creative fatigue. A refresh with new visuals and messaging is recommended.',
    confidence: 0.6,
  };
}

async function generateAIRecommendation(
  ad: FatigueAd,
  score: number,
  result: FatigueResult,
): Promise<CreativeRefreshRecommendation> {
  if (!OPENAI_API_KEY) {
    return buildFallbackRecommendation(ad, score);
  }

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
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as Partial<CreativeRefreshRecommendation>;

    return {
      headline: parsed.headline ?? 'Fresh Headline Here',
      body: parsed.body ?? 'Compelling new body copy to re-engage your audience.',
      callToAction: parsed.callToAction ?? 'Learn More',
      imageDescription:
        parsed.imageDescription ?? 'Updated visual with modern design elements',
      reasoning:
        parsed.reasoning ??
        'Based on declining CTR and rising frequency, a visual and messaging refresh is recommended.',
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ adId: ad.id, msg: message }, 'AI recommendation failed');
    return buildFallbackRecommendation(ad, score);
  }
}

async function createCreativeRefreshDraft(
  ad: FatigueAd,
  recommendation: CreativeRefreshRecommendation,
  score: number,
): Promise<string> {
  const draft = await createDraft({
    workspaceId: ad.workspaceId,
    platform: ad.platform,
    campaignId: ad.campaignId,
    adsetId: ad.adsetId,
    adId: ad.id,
    draftType: 'creative_upload',
    changeSummary: `${ad.name} - Refresh (fatigue: ${score})`,
    changeDetail: {
      headline: recommendation.headline,
      body: recommendation.body,
      callToAction: recommendation.callToAction,
      imageDescription: recommendation.imageDescription,
      source: 'ai_fatigue_recommendation',
      aiConfidence: recommendation.confidence,
    },
    aiReasoning: recommendation.reasoning,
    actorType: 'system',
    actorName: 'Fatigue Detection Worker',
  });

  return draft.id;
}

async function publishFatigueEvent(
  redis: Redis,
  eventBus: EventEmitter,
  result: FatigueResult,
): Promise<void> {
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

  await redis.publish(eventKey, payload);
  eventBus.emit('fatigue.detected', result);
}

async function publishWorkspaceSummary(
  redis: Redis,
  eventBus: EventEmitter,
  workspaceId: string,
  results: FatigueResult[],
): Promise<void> {
  const critical = results.filter((result) => result.severity === 'critical').length;
  const warning = results.filter((result) => result.severity === 'warning').length;
  const healthy = results.filter((result) => result.severity === 'healthy').length;

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
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0,
    },
  });

  await redis.publish(`workspace:${workspaceId}:fatigue`, payload);
  eventBus.emit('fatigue.summary', { workspaceId, critical, warning, healthy });
}

async function handleFatiguedAd(
  ad: FatigueAd,
  score: number,
  result: FatigueResult,
): Promise<void> {
  result.alertId = await createFatigueAlert(ad, score, result);
  const recommendation = await generateAIRecommendation(ad, score, result);
  result.recommendation = recommendation;

  if (score >= CRITICAL_THRESHOLD) {
    result.draftId = await createCreativeRefreshDraft(ad, recommendation, score);
  }

  log.info(
    { adId: ad.id, score, severity: result.severity },
    'Handled fatigued ad',
  );
}

export async function detectForWorkspace(
  workspaceId: string,
  deps: {
    redis?: Redis;
    eventBus?: EventEmitter;
  } = {},
): Promise<FatigueResult[]> {
  log.info({ workspaceId }, 'Detecting fatigue for workspace');

  const redis = deps.redis ?? getWorkerRedis();
  const eventBus = deps.eventBus ?? new EventEmitter();
  const ads = await fetchActiveAdsForWorkspace(workspaceId);
  const results: FatigueResult[] = [];

  for (const ad of ads) {
    try {
      const score = await calculateFatigueScore(ad.id, ANALYSIS_WINDOW_DAYS);
      const severity = classifyFatigueSeverity(score);
      const result: FatigueResult = {
        adId: ad.id,
        workspaceId,
        score,
        severity,
        ctrTrend: await analyzeCTRTrend(ad.id, ANALYSIS_WINDOW_DAYS),
        frequencyTrend: await analyzeFrequencyGrowth(ad.id, ANALYSIS_WINDOW_DAYS),
        conversionTrend: await analyzeConversionRateDecline(ad.id, ANALYSIS_WINDOW_DAYS),
      };

      await upsertCreativePerformance(ad.id, result);

      if (severity === 'critical' || severity === 'warning') {
        await handleFatiguedAd(ad, score, result);
      }

      await publishFatigueEvent(redis, eventBus, result);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error({ adId: ad.id, msg: message }, 'Error analyzing ad');
    }
  }

  await publishWorkspaceSummary(redis, eventBus, workspaceId, results);

  log.info(
    {
      workspaceId,
      analyzed: results.length,
      critical: results.filter((result) => result.severity === 'critical').length,
      warning: results.filter((result) => result.severity === 'warning').length,
    },
    'Workspace fatigue detection complete',
  );

  return results;
}

async function processFatigueDetectionJob(job: Job<FatigueJobData>): Promise<void> {
  const { workspaceId } = job.data;

  if (workspaceId) {
    await detectForWorkspace(workspaceId);
    return;
  }

  const workspaces = await fetchActiveWorkspaces();
  log.info({ count: workspaces.length }, 'Scanning workspaces for fatigue');

  for (const [index, workspace] of workspaces.entries()) {
    await detectForWorkspace(workspace.id);
    await job.updateProgress(Math.round(((index + 1) / workspaces.length) * 100));
  }
}

export async function scheduleRecurringFatigueDetection(): Promise<void> {
  const disableReason = getDetectFatigueDisableReason();
  if (disableReason) {
    log.info({ reason: disableReason }, 'Skipping recurring fatigue detection schedule');
    return;
  }

  await getFatigueQueue().add(
    FATIGUE_DETECTION_JOB_NAME,
    {},
    {
      repeat: { every: RECURRING_INTERVAL_MS },
      jobId: 'fatigue-detection-recurring',
    },
  );

  log.info('Recurring fatigue detection scheduled (every 6h)');
}

export async function startDetectFatigueWorker(): Promise<DetectFatigueWorkerSnapshot> {
  const disableReason = getDetectFatigueDisableReason();
  if (disableReason) {
    workerSnapshot = {
      status: 'disabled',
      enabled: false,
      reason: disableReason,
    };
    return getDetectFatigueWorkerStatus();
  }

  if (detectFatigueWorker) {
    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: workerSnapshot.startedAt,
    };
    return getDetectFatigueWorkerStatus();
  }

  workerSnapshot = { status: 'starting', enabled: true };

  try {
    detectFatigueWorker = new Worker<FatigueJobData>(
      FATIGUE_DETECTION_QUEUE_NAME,
      processFatigueDetectionJob,
      {
        connection: getWorkerRedis(),
        concurrency: PROCESSOR_CONCURRENCY,
        lockDuration: 30_000,
        stalledInterval: 30_000,
      },
    );

    detectFatigueWorker.on('completed', (job) => {
      log.info({ jobId: job.id }, 'Fatigue detection job completed');
    });

    detectFatigueWorker.on('failed', (job, err) => {
      log.error({ jobId: job?.id, msg: err.message }, 'Fatigue detection job failed');
    });

    detectFatigueWorker.on('stalled', (jobId) => {
      log.warn({ jobId }, 'Fatigue detection job stalled');
    });

    await scheduleRecurringFatigueDetection();

    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workerSnapshot = {
      status: 'error',
      enabled: true,
      reason: message,
    };
  }

  return getDetectFatigueWorkerStatus();
}

export async function stopDetectFatigueWorker(): Promise<void> {
  if (detectFatigueWorker) {
    await detectFatigueWorker.close();
    detectFatigueWorker = null;
  }

  if (fatigueDetectionQueue) {
    await fatigueDetectionQueue.close();
    fatigueDetectionQueue = null;
  }

  workerRedis = null;
  workerSnapshot = {
    status: 'stopped',
    enabled: false,
  };
}

export async function enqueueWorkspaceFatigueDetection(
  workspaceId: string,
): Promise<string | null> {
  const disableReason = getDetectFatigueDisableReason();
  if (disableReason) {
    log.info({ reason: disableReason }, 'Skipping fatigue detection enqueue');
    return null;
  }

  const job = await getFatigueQueue().add(
    FATIGUE_DETECTION_JOB_NAME,
    { workspaceId },
    { jobId: buildFatigueJobId(workspaceId) },
  );

  return job.id ?? null;
}

export async function triggerFatigueDetection(
  workspaceId: string,
): Promise<FatigueResult[]> {
  return detectForWorkspace(workspaceId);
}

export { detectFatigueWorker, fatigueDetectionQueue };
