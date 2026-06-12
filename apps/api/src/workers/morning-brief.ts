/**
 * Morning Brief Worker
 *
 * Generates and sends a daily morning brief email every day at 7 AM per user's timezone.
 * Pipeline (10 steps):
 *   1. Fetch yesterday's performance data from all platforms
 *   2. Compare to previous period (day-over-day)
 *   3. Detect anomalies (spend spikes, ROAS drops, CPA surges)
 *   4. Get AI-powered recommendations with expected impact
 *   5. Check creative fatigue (frequency, CTR decay, fatigue_score)
 *   6. Check budget pacing (spend velocity vs. budget caps)
 *   7. Generate HTML email via template
 *   8. Send via email service queue
 *   9. Create in-app notification
 *   10. Publish to Slack if workspace has webhook configured
 *
 * BullMQ cron job: "0 7 * * *" (7 AM daily, per-user timezone via cron library)
 */

import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { CronJob } from 'cron';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { AppError, PlatformError } from '../lib/errors';
import { emailService, MorningBriefData } from '../services/email';
import { slackService, MorningBriefSlackData } from '../services/slack';
import {
  generateMorningBrief,
  generateRecommendations,
  type MorningBrief as AIMorningBrief,
} from '../services/ai-service';
import { createNotification, type CreateNotificationInput } from '../services/notification-service';
import type {
  Platform,
  UnifiedCampaign,
  PerformanceGoal,
  Draft,
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const MORNING_BRIEF_QUEUE_NAME = 'morning-brief';
const DEAD_LETTER_QUEUE_NAME = 'morning-brief:dead-letter';
const MORNING_BRIEF_RATE_LIMIT_KEY = 'morning_brief:daily';
const DAILY_CREDIT_COST = 8;
const DEFAULT_BRIEF_HOUR = 7;
const DEFAULT_BRIEF_MINUTE = 0;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;
const CAMPAIGN_LOOKBACK_DAYS = 2; // yesterday + day before for comparison
const ANOMALY_Z_THRESHOLD = 2.0; // standard deviations for anomaly detection
const FATIGUE_FREQUENCY_THRESHOLD = 3.0;
const FATIGUE_CTR_DECAY_THRESHOLD = -20; // % CTR drop
const BUDGET_PACING_WARNING_PCT = 80;
const BUDGET_PACING_CRITICAL_PCT = 95;

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MorningBriefJobData {
  userId: string;
  workspaceId: string;
  email: string;
  timezone: string;
  slackWebhookUrl?: string;
}

/** Extended morning brief data with all sections */
export interface FullMorningBriefData {
  date: string;
  workspaceName: string;
  userTimezone: string;

  // Step 1-2: KPIs with day-over-day change
  kpis: {
    spend: { value: number; change: number; currency?: string };
    roas: { value: number; change: number };
    conversions: { value: number; change: number };
    cpa: { value: number; change: number };
    impressions: { value: number; change: number };
    clicks: { value: number; change: number };
    ctr: { value: number; change: number };
    reach: { value: number; change: number };
    frequency: { value: number; change: number };
  };

  // Executive summary: 3 key insights
  executiveSummary: string[];

  // Step 2: Top movers (winners and losers)
  topWinners: Array<{
    campaignId: string;
    campaignName: string;
    platform: Platform;
    metric: string;
    change: number;
    value: number;
  }>;
  topLosers: Array<{
    campaignId: string;
    campaignName: string;
    platform: Platform;
    metric: string;
    change: number;
    value: number;
  }>;

  // Step 3: Anomaly alerts
  anomalies: Array<{
    severity: 'warning' | 'critical';
    type: 'spend_spike' | 'roas_drop' | 'cpa_surge' | 'ctr_drop' | 'conversion_drop';
    campaignId: string;
    campaignName: string;
    description: string;
    currentValue: number;
    expectedValue: number;
    deviationPct: number;
  }>;

  // Step 4: AI recommendations with expected impact
  aiRecommendations: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    category: string;
    expectedImpact: string;
    confidence: 'high' | 'medium' | 'low';
  }>;

  // Step 5: Creative fatigue alerts
  creativeFatigue: Array<{
    adId: string;
    adName: string;
    campaignName: string;
    platform: Platform;
    fatigueScore: number;
    fatigueStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
    frequency: number;
    ctrDecayPct: number;
    recommendation: string;
  }>;

  // Step 6: Budget pacing warnings
  budgetPacing: Array<{
    campaignId: string;
    campaignName: string;
    platform: Platform;
    dailyBudget: number;
    spentToday: number;
    spentYesterday: number;
    pacingPct: number;
    projectedSpend: number;
    status: 'on_track' | 'warning' | 'critical' | 'underspend';
    daysRemaining?: number;
  }>;

  // Step 7: Drafts pending approval
  draftsPending: Array<{
    draftId: string;
    campaignName: string;
    type: string;
    summary: string;
    proposedBy: string;
    estimatedImpact?: string;
    createdAt: string;
  }>;

  // Step 8: Today's scheduled events
  scheduledEvents: Array<{
    type: 'draft_execution' | 'campaign_start' | 'campaign_end' | 'report' | 'goal_check';
    title: string;
    description: string;
    scheduledAt: string;
  }>;

  // AI-generated brief
  aiBrief?: AIMorningBrief;

  // Platform breakdown
  platformBreakdown: Array<{
    platform: Platform;
    spend: number;
    roas: number;
    conversions: number;
    cpa: number;
    changePct: number;
  }>;
}

interface UserTimezoneRow {
  user_id: string;
  email: string;
  workspace_id: string;
  timezone: string;
  morning_brief_enabled: boolean;
  morning_brief_time: string | null;
  slack_webhook_url: string | null;
}

interface CampaignWithChanges extends UnifiedCampaign {
  changeFromPreviousDay: {
    spend: number;
    roas: number;
    conversions: number;
    cpa: number;
    ctr: number;
    impressions: number;
    clicks: number;
  };
  yesterdayMetrics: {
    spend: number;
    roas: number;
    conversions: number;
    cpa: number;
    ctr: number;
    impressions: number;
    clicks: number;
  };
  dayBeforeMetrics: {
    spend: number;
    roas: number;
    conversions: number;
    cpa: number;
    ctr: number;
    impressions: number;
    clicks: number;
  };
}

interface PerformanceSnapshot {
  date: string;
  campaign_id: string;
  platform_campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpa: number;
  ctr: number;
  frequency: number;
  reach: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYesterdayRange(tz: string): { start: string; end: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  // Yesterday in user's timezone
  const userNow = new Date(`${year}-${month}-${day}T00:00:00`);
  const yesterday = new Date(userNow.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);

  return {
    start: dayBefore.toISOString().slice(0, 10),
    end: yesterday.toISOString().slice(0, 10),
  };
}

function formatDateInTz(date: Date, tz: string): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Morning Brief Worker Class ──────────────────────────────────────────────

export class MorningBriefWorker {
  private redis: Redis;
  private briefQueue: Queue;
  private cronJobs: Map<string, CronJob> = new Map();
  private isDisposed = false;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.briefQueue = new Queue(MORNING_BRIEF_QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: MAX_RETRIES,
        backoff: { type: 'exponential', delay: RETRY_BACKOFF_MS },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 500 },
        removeOnFail: { age: 14 * 24 * 60 * 60, count: 200 },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize morning brief scheduling for all users.
   * Call once on application startup.
   */
  async initialize(): Promise<void> {
    logger.info('[MorningBrief] Initializing scheduling...');

    try {
      const users = await this.getUsersWithMorningBriefEnabled();
      logger.info(`[MorningBrief] Found ${users.length} user(s) with morning brief enabled`);

      for (const user of users) {
        await this.scheduleForUser(user);
        // Breathing room between scheduling operations
        await sleep(50);
      }

      logger.info(`[MorningBrief] Scheduled briefs for ${users.length} user(s)`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message }, '[MorningBrief] Failed to initialize scheduling');
      throw err;
    }
  }

  /**
   * Core method: generate the full morning brief for a user + workspace.
   * Steps 1-7 of the pipeline.
   */
  async generateForUser(userId: string, workspaceId: string): Promise<FullMorningBriefData> {
    const startTime = Date.now();
    logger.info({ userId, workspaceId }, '[MorningBrief] Starting generation');

    try {
      // ── Get user info ──
      const userRow = await this.getUserRow(userId, workspaceId);
      if (!userRow) {
        throw new AppError('USER_NOT_FOUND', `User ${userId} not found in workspace ${workspaceId}`, 404);
      }

      const tz = userRow.timezone || 'UTC';
      const dateRange = getYesterdayRange(tz);

      // ── Step 1: Fetch yesterday's performance data ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 1: Fetching performance data');
      const campaigns = await this.fetchCampaignPerformance(workspaceId, dateRange);

      // ── Step 2: Compare to previous period ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 2: Computing day-over-day changes');
      const campaignsWithChanges = this.computeDayOverDayChanges(campaigns);
      const kpis = this.calculateKpis(campaignsWithChanges);
      const platformBreakdown = this.calculatePlatformBreakdown(campaignsWithChanges);

      // ── Step 3: Detect anomalies ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 3: Detecting anomalies');
      const anomalies = this.detectAnomalies(campaignsWithChanges);

      // ── Step 4: Get AI recommendations ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 4: Getting AI recommendations');
      const aiRecommendations = await this.getAIRecommendations(workspaceId, campaignsWithChanges);

      // ── Step 5: Check creative fatigue ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 5: Checking creative fatigue');
      const creativeFatigue = await this.checkCreativeFatigue(workspaceId, campaignsWithChanges);

      // ── Step 6: Check budget pacing ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 6: Checking budget pacing');
      const budgetPacing = await this.checkBudgetPacing(workspaceId, campaignsWithChanges);

      // ── Step 7: Get drafts pending approval ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 7: Fetching pending drafts');
      const draftsPending = await this.getPendingDrafts(workspaceId);

      // ── Step 8: Get today's scheduled events ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Step 8: Fetching scheduled events');
      const scheduledEvents = await this.getScheduledEvents(workspaceId, tz);

      // ── Get AI-powered executive summary ──
      logger.debug({ userId, workspaceId }, '[MorningBrief] Getting AI executive summary');
      const aiBrief = await this.getAIBrief(workspaceId, campaignsWithChanges, dateRange);

      // ── Compute top winners & losers ──
      const { topWinners, topLosers } = this.computeTopMovers(campaignsWithChanges);

      // ── Build executive summary (3 key insights) ──
      const executiveSummary = this.buildExecutiveSummary(
        kpis,
        topWinners,
        topLosers,
        anomalies,
        aiBrief,
      );

      // ── Assemble full brief ──
      const workspaceName = await this.getWorkspaceName(workspaceId);
      const brief: FullMorningBriefData = {
        date: formatDateInTz(new Date(), tz),
        workspaceName,
        userTimezone: tz,
        kpis,
        executiveSummary,
        topWinners,
        topLosers,
        anomalies,
        aiRecommendations,
        creativeFatigue,
        budgetPacing,
        draftsPending,
        scheduledEvents,
        aiBrief: aiBrief ?? undefined,
        platformBreakdown,
      };

      const duration = Date.now() - startTime;
      logger.info(
        { userId, workspaceId, durationMs: duration, campaignsAnalyzed: campaignsWithChanges.length },
        '[MorningBrief] Generation complete',
      );

      return brief;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, userId, workspaceId, durationMs: Date.now() - startTime }, '[MorningBrief] Generation failed');
      throw err;
    }
  }

  /**
   * Step 9: Send morning brief email via email service queue.
   */
  async sendEmail(userId: string, workspaceId: string, data: FullMorningBriefData): Promise<void> {
    const startTime = Date.now();
    logger.debug({ userId }, '[MorningBrief] Sending email');

    try {
      // Convert FullMorningBriefData to the email service's MorningBriefData format
      const emailData: MorningBriefData = {
        date: data.date,
        workspaceName: data.workspaceName,
        kpis: {
          spend: { value: data.kpis.spend.value, change: data.kpis.spend.change },
          roas: { value: data.kpis.roas.value, change: data.kpis.roas.change },
          conversions: { value: data.kpis.conversions.value, change: data.kpis.conversions.change },
          cpa: { value: data.kpis.cpa.value, change: data.kpis.cpa.change },
        },
        topWinners: data.topWinners.map((w) => ({ name: w.campaignName, metric: w.metric, change: w.change })),
        topLosers: data.topLosers.map((l) => ({ name: l.campaignName, metric: l.metric, change: l.change })),
        recommendations: data.aiRecommendations.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          impact: r.impact,
          category: r.category,
        })),
        insights: data.executiveSummary,
      };

      await emailService.sendMorningBrief(userId, workspaceId, emailData);
      logger.debug({ userId, durationMs: Date.now() - startTime }, '[MorningBrief] Email queued');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, userId }, '[MorningBrief] Email send failed');
      throw err;
    }
  }

  /**
   * Step 9b: Create in-app notification for the morning brief.
   */
  async createInAppNotification(userId: string, data: FullMorningBriefData): Promise<void> {
    logger.debug({ userId }, '[MorningBrief] Creating in-app notification');

    try {
      const notification: CreateNotificationInput = {
        workspaceId: data.workspaceName, // Will be resolved to actual workspaceId
        userId,
        type: 'draft_pending', // Using closest available type; consider adding 'morning_brief' to NotificationType
        title: `Daily Brief — ${data.date}`,
        message: `Spend: $${data.kpis.spend.value.toLocaleString()} · ROAS: ${data.kpis.roas.value}x · ${data.aiRecommendations.length} AI recommendations · ${data.anomalies.length} alerts`,
        data: {
          workspaceName: data.workspaceName,
          kpis: data.kpis,
          recommendationCount: data.aiRecommendations.length,
          anomalyCount: data.anomalies.length,
          fatigueAlertCount: data.creativeFatigue.length,
          budgetAlertCount: data.budgetPacing.filter((b) => b.status === 'warning' || b.status === 'critical').length,
          draftCount: data.draftsPending.length,
          type: 'morning_brief',
        },
      };

      await createNotification(notification);
      logger.debug({ userId }, '[MorningBrief] In-app notification created');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, userId }, '[MorningBrief] In-app notification failed');
      // Non-fatal: don't throw, just log
    }
  }

  /**
   * Step 10: Publish morning brief to Slack if workspace has webhook configured.
   */
  async publishToSlack(workspaceId: string, data: FullMorningBriefData, webhookUrl?: string): Promise<void> {
    if (!webhookUrl) {
      logger.debug({ workspaceId }, '[MorningBrief] No Slack webhook configured, skipping');
      return;
    }

    logger.debug({ workspaceId }, '[MorningBrief] Publishing to Slack');

    try {
      const slackData: MorningBriefSlackData = {
        date: data.date,
        workspaceName: data.workspaceName,
        kpis: {
          spend: { value: data.kpis.spend.value, change: data.kpis.spend.change },
          roas: { value: data.kpis.roas.value, change: data.kpis.roas.change },
          conversions: { value: data.kpis.conversions.value, change: data.kpis.conversions.change },
          cpa: { value: data.kpis.cpa.value, change: data.kpis.cpa.change },
        },
        topWinners: data.topWinners.map((w) => ({
          name: w.campaignName,
          metric: w.metric,
          change: w.change,
        })),
        recommendationsCount: data.aiRecommendations.length,
        dashboardUrl: `${process.env.APP_URL || 'https://app.adnexus.ai'}/dashboard`,
      };

      await slackService.sendMorningBrief(webhookUrl, slackData);
      logger.debug({ workspaceId }, '[MorningBrief] Slack publish complete');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, workspaceId }, '[MorningBrief] Slack publish failed');
      // Non-fatal: don't throw, just log
    }
  }

  /**
   * Schedule morning brief for a specific user with timezone-aware cron.
   */
  async scheduleForUser(user: UserTimezoneRow): Promise<void> {
    const cronKey = `morning_brief:${user.user_id}`;

    // Stop existing cron job if any
    this.unscheduleForUser(user.user_id);

    if (!user.morning_brief_enabled) {
      logger.debug({ userId: user.user_id }, '[MorningBrief] Morning brief disabled');
      return;
    }

    // Parse time (default to 7:00 AM)
    const [hour, minute] = user.morning_brief_time
      ? user.morning_brief_time.split(':').map(Number)
      : [DEFAULT_BRIEF_HOUR, DEFAULT_BRIEF_MINUTE];

    const cronExpression = `${minute} ${hour} * * *`;

    const job = new CronJob(
      cronExpression,
      async () => {
        logger.info({ userId: user.user_id, workspaceId: user.workspace_id }, '[MorningBrief] Cron triggered');
        try {
          await this.briefQueue.add(
            'generate-and-send',
            {
              userId: user.user_id,
              workspaceId: user.workspace_id,
              email: user.email,
              timezone: user.timezone,
              slackWebhookUrl: user.slack_webhook_url ?? undefined,
            } as MorningBriefJobData,
            {
              jobId: `morning-brief-${user.user_id}-${Date.now()}`,
              priority: 5,
            },
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error({ error: err.message, userId: user.user_id }, '[MorningBrief] Cron enqueue failed');
        }
      },
      null,
      false,
      user.timezone,
    );

    job.start();
    this.cronJobs.set(cronKey, job);

    logger.debug(
      {
        userId: user.user_id,
        timezone: user.timezone,
        scheduledTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      },
      '[MorningBrief] Scheduled',
    );
  }

  /**
   * Schedule morning briefs for all users in a timezone.
   * Called by the global scheduler to stagger load.
   */
  async scheduleForTimezone(timezone: string): Promise<void> {
    logger.info({ timezone }, '[MorningBrief] Scheduling for timezone');

    try {
      const users = await this.getUsersInTimezone(timezone);
      for (const user of users) {
        if (user.morning_brief_enabled) {
          await this.scheduleForUser(user);
        }
      }
      logger.info({ timezone, count: users.length }, '[MorningBrief] Timezone scheduling complete');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, timezone }, '[MorningBrief] Timezone scheduling failed');
      throw err;
    }
  }

  /**
   * Remove morning brief schedule for a user.
   */
  unscheduleForUser(userId: string): void {
    const cronKey = `morning_brief:${userId}`;
    const existingJob = this.cronJobs.get(cronKey);
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(cronKey);
      logger.debug({ userId }, '[MorningBrief] Unscheduled');
    }
  }

  /**
   * Process a single morning brief job end-to-end (all 10 steps).
   */
  async processJob(job: Job<MorningBriefJobData>): Promise<void> {
    const { userId, workspaceId, slackWebhookUrl } = job.data;
    const startTime = Date.now();

    logger.info({ jobId: job.id, userId, workspaceId }, '[MorningBrief] Processing job');

    try {
      // ── Step 1-8: Generate the brief ──
      await job.updateProgress(10);
      const brief = await this.generateForUser(userId, workspaceId);
      await job.updateProgress(50);

      // ── Step 9: Send email ──
      await this.sendEmail(userId, workspaceId, brief);
      await job.updateProgress(70);

      // ── Step 9b: In-app notification ──
      await this.createInAppNotification(userId, brief);
      await job.updateProgress(80);

      // ── Step 10: Slack publish ──
      await this.publishToSlack(workspaceId, brief, slackWebhookUrl);
      await job.updateProgress(95);

      // ── Log completion ──
      const duration = Date.now() - startTime;
      await this.logBriefDelivery(userId, workspaceId, brief, duration);
      await job.updateProgress(100);

      logger.info(
        {
          jobId: job.id,
          userId,
          workspaceId,
          durationMs: duration,
          campaignsAnalyzed: brief.platformBreakdown.reduce((s, p) => s + p.conversions, 0),
          recommendations: brief.aiRecommendations.length,
          anomalies: brief.anomalies.length,
        },
        '[MorningBrief] Job completed successfully',
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          jobId: job.id,
          userId,
          workspaceId,
          error: err.message,
          attempt: job.attemptsMade + 1,
          durationMs: Date.now() - startTime,
        },
        '[MorningBrief] Job failed',
      );
      throw err;
    }
  }

  /**
   * Dispose all resources.
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const [key, job] of this.cronJobs) {
      job.stop();
      logger.debug({ cronKey: key }, '[MorningBrief] Stopped cron job');
    }
    this.cronJobs.clear();

    await this.briefQueue.close();
    await this.redis.quit();
    logger.info('[MorningBrief] Disposed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: FETCH PERFORMANCE DATA
  // ═══════════════════════════════════════════════════════════════════════════

  private async fetchCampaignPerformance(
    workspaceId: string,
    dateRange: { start: string; end: string },
  ): Promise<CampaignWithChanges[]> {
    // Fetch campaigns for this workspace with connected ad accounts
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        ad_accounts!inner(workspace_id, platform)
      `)
      .eq('ad_accounts.workspace_id', workspaceId)
      .neq('status', 'ended');

    if (error) {
      throw new PlatformError('database', `Failed to fetch campaigns: ${error.message}`);
    }

    if (!campaigns || campaigns.length === 0) {
      logger.debug({ workspaceId }, '[MorningBrief] No campaigns found');
      return [];
    }

    // Fetch yesterday and day-before snapshots from campaign_daily_metrics
    const { data: snapshots, error: snapError } = await supabase
      .from('campaign_daily_metrics')
      .select('*')
      .in(
        'campaign_id',
        campaigns.map((c) => c.id),
      )
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: false });

    if (snapError) {
      logger.warn({ error: snapError.message }, '[MorningBrief] Failed to fetch daily metrics, using current campaign data');
    }

    const snapshotMap = new Map<string, PerformanceSnapshot[]>();
    for (const snap of (snapshots ?? [])) {
      const existing = snapshotMap.get(snap.campaign_id) ?? [];
      existing.push(snap as PerformanceSnapshot);
      snapshotMap.set(snap.campaign_id, existing);
    }

    // Build enriched campaign objects
    return campaigns.map((campaign): CampaignWithChanges => {
      const campaignSnapshots = snapshotMap.get(campaign.id) ?? [];
      const yesterday = campaignSnapshots[0]; // Most recent
      const dayBefore = campaignSnapshots[1]; // Previous day

      const zero = { spend: 0, roas: 0, conversions: 0, cpa: 0, ctr: 0, impressions: 0, clicks: 0 };

      return {
        ...campaign,
        platform: (campaign.ad_accounts as unknown as { platform: Platform })?.platform ?? 'meta',
        yesterdayMetrics: yesterday
          ? {
              spend: yesterday.spend ?? 0,
              roas: yesterday.roas ?? 0,
              conversions: yesterday.conversions ?? 0,
              cpa: yesterday.cpa ?? 0,
              ctr: yesterday.ctr ?? 0,
              impressions: yesterday.impressions ?? 0,
              clicks: yesterday.clicks ?? 0,
            }
          : zero,
        dayBeforeMetrics: dayBefore
          ? {
              spend: dayBefore.spend ?? 0,
              roas: dayBefore.roas ?? 0,
              conversions: dayBefore.conversions ?? 0,
              cpa: dayBefore.cpa ?? 0,
              ctr: dayBefore.ctr ?? 0,
              impressions: dayBefore.impressions ?? 0,
              clicks: dayBefore.clicks ?? 0,
            }
          : zero,
        changeFromPreviousDay: {
          spend: pctChange(
            yesterday?.spend ?? campaign.spend ?? 0,
            dayBefore?.spend ?? 0,
          ),
          roas: pctChange(
            yesterday?.roas ?? campaign.roas ?? 0,
            dayBefore?.roas ?? 0,
          ),
          conversions: pctChange(
            yesterday?.conversions ?? campaign.conversions ?? 0,
            dayBefore?.conversions ?? 0,
          ),
          cpa: pctChange(
            yesterday?.cpa ?? campaign.cpa ?? 0,
            dayBefore?.cpa ?? 0,
          ),
          ctr: pctChange(
            yesterday?.ctr ?? campaign.ctr ?? 0,
            dayBefore?.ctr ?? 0,
          ),
          impressions: pctChange(
            yesterday?.impressions ?? campaign.impressions ?? 0,
            dayBefore?.impressions ?? 0,
          ),
          clicks: pctChange(
            yesterday?.clicks ?? campaign.clicks ?? 0,
            dayBefore?.clicks ?? 0,
          ),
        },
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: DAY-OVER-DAY CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  private computeDayOverDayChanges(campaigns: CampaignWithChanges[]): CampaignWithChanges[] {
    return campaigns;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 (cont): CALCULATE KPIs & PLATFORM BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateKpis(campaigns: CampaignWithChanges[]): FullMorningBriefData['kpis'] {
    const totalSpend = campaigns.reduce((s, c) => s + c.yesterdayMetrics.spend, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.yesterdayMetrics.conversions, 0);
    const totalRevenue = campaigns.reduce(
      (s, c) => s + c.yesterdayMetrics.spend * c.yesterdayMetrics.roas,
      0,
    );
    const totalImpressions = campaigns.reduce((s, c) => s + c.yesterdayMetrics.impressions, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.yesterdayMetrics.clicks, 0);
    const totalReach = campaigns.reduce((s, c) => s + ((c.yesterdayMetrics as unknown as Record<string, number>).reach || 0), 0);
    const avgFrequency = campaigns.length > 0
      ? campaigns.reduce((s, c) => s + (c.frequency ?? 0), 0) / campaigns.length
      : 0;

    const prevSpend = campaigns.reduce((s, c) => s + c.dayBeforeMetrics.spend, 0);
    const prevConversions = campaigns.reduce((s, c) => s + c.dayBeforeMetrics.conversions, 0);
    const prevRevenue = campaigns.reduce(
      (s, c) => s + c.dayBeforeMetrics.spend * c.dayBeforeMetrics.roas,
      0,
    );
    const prevImpressions = campaigns.reduce((s, c) => s + c.dayBeforeMetrics.impressions, 0);
    const prevClicks = campaigns.reduce((s, c) => s + c.dayBeforeMetrics.clicks, 0);

    const weightedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const prevWeightedRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const prevAvgCpa = prevConversions > 0 ? prevSpend / prevConversions : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;

    return {
      spend: {
        value: Math.round(totalSpend * 100) / 100,
        change: pctChange(totalSpend, prevSpend),
      },
      roas: {
        value: Math.round(weightedRoas * 100) / 100,
        change: pctChange(weightedRoas, prevWeightedRoas),
      },
      conversions: {
        value: totalConversions,
        change: pctChange(totalConversions, prevConversions),
      },
      cpa: {
        value: Math.round(avgCpa * 100) / 100,
        change: pctChange(avgCpa, prevAvgCpa),
      },
      impressions: {
        value: totalImpressions,
        change: pctChange(totalImpressions, prevImpressions),
      },
      clicks: {
        value: totalClicks,
        change: pctChange(totalClicks, prevClicks),
      },
      ctr: {
        value: Math.round(ctr * 100) / 100,
        change: pctChange(ctr, prevCtr),
      },
      reach: {
        value: Math.round(totalReach),
        change: 0, // Would need historical data
      },
      frequency: {
        value: Math.round(avgFrequency * 100) / 100,
        change: 0,
      },
    };
  }

  private calculatePlatformBreakdown(
    campaigns: CampaignWithChanges[],
  ): FullMorningBriefData['platformBreakdown'] {
    const platformMap = new Map<Platform, CampaignWithChanges[]>();

    for (const c of campaigns) {
      const list = platformMap.get(c.platform) ?? [];
      list.push(c);
      platformMap.set(c.platform, list);
    }

    return Array.from(platformMap.entries()).map(([platform, pcs]) => {
      const spend = pcs.reduce((s, c) => s + c.yesterdayMetrics.spend, 0);
      const conversions = pcs.reduce((s, c) => s + c.yesterdayMetrics.conversions, 0);
      const revenue = pcs.reduce(
        (s, c) => s + c.yesterdayMetrics.spend * c.yesterdayMetrics.roas,
        0,
      );
      const prevSpend = pcs.reduce((s, c) => s + c.dayBeforeMetrics.spend, 0);
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      return {
        platform,
        spend,
        roas: Math.round(roas * 100) / 100,
        conversions,
        cpa: Math.round(cpa * 100) / 100,
        changePct: pctChange(spend, prevSpend),
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 (cont): TOP MOVERS
  // ═══════════════════════════════════════════════════════════════════════════

  private computeTopMovers(campaigns: CampaignWithChanges[]): {
    topWinners: FullMorningBriefData['topWinners'];
    topLosers: FullMorningBriefData['topLosers'];
  } {
    // Compute composite score for each campaign
    const scored = campaigns.map((c) => {
      const roasChange = c.changeFromPreviousDay.roas;
      const convChange = c.changeFromPreviousDay.conversions;
      const cpaChange = -c.changeFromPreviousDay.cpa; // Negative CPA change is good
      const ctrChange = c.changeFromPreviousDay.ctr;
      const composite = (roasChange + convChange + cpaChange + ctrChange) / 4;
      return { campaign: c, composite };
    });

    const winners = scored
      .filter((s) => s.composite > 5)
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 3)
      .map((s) => ({
        campaignId: s.campaign.id,
        campaignName: s.campaign.name,
        platform: s.campaign.platform,
        metric: s.campaign.changeFromPreviousDay.roas > s.campaign.changeFromPreviousDay.conversions
          ? 'ROAS'
          : 'Conversions',
        change: Math.round(s.composite * 10) / 10,
        value: s.campaign.yesterdayMetrics.roas,
      }));

    const losers = scored
      .filter((s) => s.composite < -5)
      .sort((a, b) => a.composite - b.composite)
      .slice(0, 3)
      .map((s) => ({
        campaignId: s.campaign.id,
        campaignName: s.campaign.name,
        platform: s.campaign.platform,
        metric: s.campaign.changeFromPreviousDay.cpa > 20 ? 'CPA' : 'ROAS',
        change: Math.round(s.composite * 10) / 10,
        value: s.campaign.yesterdayMetrics.cpa,
      }));

    return { topWinners: winners, topLosers: losers };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private detectAnomalies(campaigns: CampaignWithChanges[]): FullMorningBriefData['anomalies'] {
    const anomalies: FullMorningBriefData['anomalies'] = [];
    if (campaigns.length === 0) return anomalies;

    // Compute campaign-level statistics
    const spendValues = campaigns.map((c) => c.yesterdayMetrics.spend);
    const roasValues = campaigns.map((c) => c.yesterdayMetrics.roas);
    const cpaValues = campaigns.map((c) => c.yesterdayMetrics.cpa);
    const ctrValues = campaigns.map((c) => c.yesterdayMetrics.ctr);
    const convValues = campaigns.map((c) => c.yesterdayMetrics.conversions);

    const spendMean = mean(spendValues);
    const spendStd = stdDev(spendValues);
    const roasMean = mean(roasValues);
    const roasStd = stdDev(roasValues);
    const cpaMean = mean(cpaValues);
    const cpaStd = stdDev(cpaValues);
    const ctrMean = mean(ctrValues);
    const ctrStd = stdDev(ctrValues);
    const convMean = mean(convValues);
    const convStd = stdDev(convValues);

    for (const c of campaigns) {
      // Spend spike
      const spendZ = zScore(c.yesterdayMetrics.spend, spendMean, spendStd);
      if (spendZ > ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          severity: spendZ > ANOMALY_Z_THRESHOLD * 1.5 ? 'critical' : 'warning',
          type: 'spend_spike',
          campaignId: c.id,
          campaignName: c.name,
          description: `Spend is ${Math.round(spendZ * 10) / 10}σ above normal ($${c.yesterdayMetrics.spend.toLocaleString()})`,
          currentValue: c.yesterdayMetrics.spend,
          expectedValue: spendMean,
          deviationPct: Math.round(spendZ * 100),
        });
      }

      // ROAS drop
      const roasZ = zScore(c.yesterdayMetrics.roas, roasMean, roasStd);
      if (roasZ < -ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          severity: roasZ < -ANOMALY_Z_THRESHOLD * 1.5 ? 'critical' : 'warning',
          type: 'roas_drop',
          campaignId: c.id,
          campaignName: c.name,
          description: `ROAS dropped to ${c.yesterdayMetrics.roas.toFixed(2)}x (${Math.round(c.changeFromPreviousDay.roas)}% vs. prior day)`,
          currentValue: c.yesterdayMetrics.roas,
          expectedValue: roasMean,
          deviationPct: Math.round(roasZ * 100),
        });
      }

      // CPA surge
      if (c.yesterdayMetrics.cpa > cpaMean * 1.5 && c.yesterdayMetrics.cpa > 0) {
        anomalies.push({
          severity: c.yesterdayMetrics.cpa > cpaMean * 2 ? 'critical' : 'warning',
          type: 'cpa_surge',
          campaignId: c.id,
          campaignName: c.name,
          description: `CPA surged to $${c.yesterdayMetrics.cpa.toFixed(2)} (avg: $${cpaMean.toFixed(2)})`,
          currentValue: c.yesterdayMetrics.cpa,
          expectedValue: cpaMean,
          deviationPct: Math.round(((c.yesterdayMetrics.cpa - cpaMean) / cpaMean) * 100),
        });
      }

      // CTR drop
      const ctrZ = zScore(c.yesterdayMetrics.ctr, ctrMean, ctrStd);
      if (ctrZ < -ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          severity: 'warning',
          type: 'ctr_drop',
          campaignId: c.id,
          campaignName: c.name,
          description: `CTR is ${Math.round(ctrZ * 10) / 10}σ below average (${c.yesterdayMetrics.ctr.toFixed(2)}%)`,
          currentValue: c.yesterdayMetrics.ctr,
          expectedValue: ctrMean,
          deviationPct: Math.round(ctrZ * 100),
        });
      }

      // Conversion drop
      if (c.changeFromPreviousDay.conversions < -50 && c.yesterdayMetrics.conversions < convMean * 0.5) {
        anomalies.push({
          severity: 'critical',
          type: 'conversion_drop',
          campaignId: c.id,
          campaignName: c.name,
          description: `Conversions dropped ${Math.abs(c.changeFromPreviousDay.conversions)}% to ${c.yesterdayMetrics.conversions}`,
          currentValue: c.yesterdayMetrics.conversions,
          expectedValue: convMean,
          deviationPct: c.changeFromPreviousDay.conversions,
        });
      }
    }

    // Sort by severity (critical first) then by deviation
    return anomalies.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return Math.abs(b.deviationPct) - Math.abs(a.deviationPct);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: AI RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getAIRecommendations(
    workspaceId: string,
    campaigns: CampaignWithChanges[],
  ): Promise<FullMorningBriefData['aiRecommendations']> {
    try {
      // Fetch goals for context
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      const unifiedCampaigns: UnifiedCampaign[] = campaigns.map((c) => ({
        id: c.id,
        ad_account_id: c.ad_account_id,
        platform: c.platform,
        platform_campaign_id: c.platform_campaign_id,
        name: c.name,
        status: c.status as 'active' | 'paused' | 'draft' | 'error' | 'ended',
        objective: c.objective ?? undefined,
        daily_budget: c.daily_budget ?? undefined,
        lifetime_budget: c.lifetime_budget ?? undefined,
        budget_type: c.budget_type as 'daily' | 'lifetime' | undefined,
        spend: c.yesterdayMetrics.spend,
        impressions: c.yesterdayMetrics.impressions,
        clicks: c.yesterdayMetrics.clicks,
        ctr: c.yesterdayMetrics.ctr,
        conversions: c.yesterdayMetrics.conversions,
        cpa: c.yesterdayMetrics.cpa,
        roas: c.yesterdayMetrics.roas,
        frequency: c.frequency ?? 0,
        reach: 0,
        cpm: c.cpm ?? 0,
        cpc: c.cpc ?? 0,
        start_date: c.start_date ?? undefined,
        end_date: c.end_date ?? undefined,
        platform_data: c.platform_data,
        created_at: c.created_at,
      }));

      const aiRecs = await generateRecommendations(
        workspaceId,
        unifiedCampaigns,
        (goals ?? []) as PerformanceGoal[],
      );

      return aiRecs.slice(0, 5).map((rec, idx) => ({
        id: `rec_${idx + 1}`,
        title: this.formatRecommendationTitle(rec.type, rec.campaignId, campaigns),
        description: rec.reasoning,
        impact: rec.priority,
        category: this.categorizeRecommendation(rec.type),
        expectedImpact: rec.expectedImpact,
        confidence: 'medium' as const,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message, workspaceId }, '[MorningBrief] AI recommendations failed, using fallback');
      return this.getFallbackRecommendations(campaigns);
    }
  }

  private async getAIBrief(
    workspaceId: string,
    campaigns: CampaignWithChanges[],
    dateRange: { start: string; end: string },
  ): Promise<AIMorningBrief | null> {
    try {
      const unifiedCampaigns: UnifiedCampaign[] = campaigns.map((c) => ({
        id: c.id,
        ad_account_id: c.ad_account_id,
        platform: c.platform,
        platform_campaign_id: c.platform_campaign_id,
        name: c.name,
        status: c.status as 'active' | 'paused' | 'draft' | 'error' | 'ended',
        objective: c.objective ?? undefined,
        daily_budget: c.daily_budget ?? undefined,
        lifetime_budget: c.lifetime_budget ?? undefined,
        budget_type: c.budget_type as 'daily' | 'lifetime' | undefined,
        spend: c.yesterdayMetrics.spend,
        impressions: c.yesterdayMetrics.impressions,
        clicks: c.yesterdayMetrics.clicks,
        ctr: c.yesterdayMetrics.ctr,
        conversions: c.yesterdayMetrics.conversions,
        cpa: c.yesterdayMetrics.cpa,
        roas: c.yesterdayMetrics.roas,
        frequency: c.frequency ?? 0,
        reach: 0,
        cpm: c.cpm ?? 0,
        cpc: c.cpc ?? 0,
        start_date: c.start_date ?? undefined,
        end_date: c.end_date ?? undefined,
        platform_data: c.platform_data,
        created_at: c.created_at,
      }));

      return await generateMorningBrief(workspaceId, unifiedCampaigns, dateRange);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message, workspaceId }, '[MorningBrief] AI brief generation failed');
      return null;
    }
  }

  private formatRecommendationTitle(type: string, campaignId: string, campaigns: CampaignWithChanges[]): string {
    const campaign = campaigns.find((c) => c.id === campaignId);
    const campaignName = campaign?.name ?? 'Campaign';

    switch (type) {
      case 'budget':
        return `Optimize budget for ${campaignName}`;
      case 'targeting':
        return `Refine targeting on ${campaignName}`;
      case 'creative':
        return `Refresh creative for ${campaignName}`;
      case 'bidding':
        return `Adjust bidding strategy for ${campaignName}`;
      case 'pause':
        return `Pause underperformer: ${campaignName}`;
      case 'scale':
        return `Scale winner: ${campaignName}`;
      default:
        return `Optimize ${campaignName}`;
    }
  }

  private categorizeRecommendation(type: string): string {
    switch (type) {
      case 'budget':
        return 'Budget Optimization';
      case 'targeting':
        return 'Audience';
      case 'creative':
        return 'Creative';
      case 'bidding':
        return 'Bidding';
      case 'pause':
        return 'Performance';
      case 'scale':
        return 'Growth';
      default:
        return 'Optimization';
    }
  }

  private getFallbackRecommendations(
    campaigns: CampaignWithChanges[],
  ): FullMorningBriefData['aiRecommendations'] {
    const recs: FullMorningBriefData['aiRecommendations'] = [];

    // Budget increase for high ROAS campaigns
    const highRoas = campaigns.filter((c) => c.yesterdayMetrics.roas > 4);
    for (const c of highRoas.slice(0, 2)) {
      recs.push({
        id: `rec_budget_${c.id}`,
        title: `Increase budget on ${c.name}`,
        description: `ROAS is ${c.yesterdayMetrics.roas.toFixed(1)}x — increasing budget by 20% could yield additional conversions while maintaining profitability.`,
        impact: 'high',
        category: 'Budget Optimization',
        expectedImpact: `+${Math.round(c.yesterdayMetrics.conversions * 0.2)} conversions`,
        confidence: 'high',
      });
    }

    // Pause underperformers
    const underperformers = campaigns.filter(
      (c) => c.yesterdayMetrics.cpa > 80 && c.changeFromPreviousDay.cpa > 20,
    );
    if (underperformers.length > 0) {
      const c = underperformers[0];
      recs.push({
        id: `rec_pause_${c.id}`,
        title: `Review underperformer: ${c.name}`,
        description: `CPA is $${c.yesterdayMetrics.cpa.toFixed(2)}, which is ${c.changeFromPreviousDay.cpa}% above average. Consider pausing or reducing budget.`,
        impact: 'medium',
        category: 'Performance',
        expectedImpact: `Save ~$${Math.round(c.yesterdayMetrics.spend * 0.3)}/day`,
        confidence: 'medium',
      });
    }

    // Creative refresh for low CTR
    const lowCtr = campaigns.filter((c) => c.yesterdayMetrics.ctr < 0.8);
    for (const c of lowCtr.slice(0, 1)) {
      recs.push({
        id: `rec_creative_${c.id}`,
        title: `A/B test new creative for ${c.name}`,
        description: `CTR of ${c.yesterdayMetrics.ctr.toFixed(2)}% is below benchmark. Fresh creative variants could improve engagement by 15-25%.`,
        impact: 'medium',
        category: 'Creative',
        expectedImpact: '+15-25% CTR improvement',
        confidence: 'medium',
      });
    }

    return recs;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: CREATIVE FATIGUE CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  private async checkCreativeFatigue(
    workspaceId: string,
    campaigns: CampaignWithChanges[],
  ): Promise<FullMorningBriefData['creativeFatigue']> {
    const alerts: FullMorningBriefData['creativeFatigue'] = [];

    try {
      // Fetch ads with fatigue data for these campaigns
      const { data: ads } = await supabase
        .from('ads')
        .select(`
          *,
          campaigns!inner(id, name, platform)
        `)
        .in(
          'campaign_id',
          campaigns.map((c) => c.id),
        )
        .eq('status', 'active');

      if (!ads || ads.length === 0) return alerts;

      for (const ad of ads) {
        const campaign = campaigns.find((c) => c.id === ad.campaign_id);
        if (!campaign) continue;

        const frequency = campaign.frequency ?? 0;
        const ctrDecay = campaign.changeFromPreviousDay.ctr;
        const fatigueScore = ad.fatigue_score ?? this.estimateFatigueScore(frequency, ctrDecay);
        const fatigueStatus = this.classifyFatigueStatus(fatigueScore, frequency);

        if (fatigueStatus === 'healthy') continue;

        alerts.push({
          adId: ad.id,
          adName: ad.name,
          campaignName: campaign.name,
          platform: campaign.platform,
          fatigueScore: Math.round(fatigueScore),
          fatigueStatus,
          frequency: Math.round(frequency * 10) / 10,
          ctrDecayPct: Math.round(ctrDecay * 10) / 10,
          recommendation: this.getFatigueRecommendation(fatigueStatus, frequency),
        });
      }

      // Sort by fatigue score descending
      return alerts.sort((a, b) => b.fatigueScore - a.fatigueScore).slice(0, 5);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message, workspaceId }, '[MorningBrief] Creative fatigue check failed');
      return alerts;
    }
  }

  private estimateFatigueScore(frequency: number, ctrDecay: number): number {
    let score = 0;
    // Frequency component (0-50)
    score += Math.min(50, (frequency / 5) * 50);
    // CTR decay component (0-50)
    if (ctrDecay < 0) {
      score += Math.min(50, Math.abs(ctrDecay) * 2.5);
    }
    return Math.min(100, Math.max(0, score));
  }

  private classifyFatigueStatus(
    score: number,
    frequency: number,
  ): 'healthy' | 'warning' | 'critical' | 'exhausted' {
    if (score >= 76 || frequency > 5) return 'exhausted';
    if (score >= 51 || frequency > 3.5) return 'critical';
    if (score >= 26 || frequency > 2.5) return 'warning';
    return 'healthy';
  }

  private getFatigueRecommendation(status: string, frequency: number): string {
    switch (status) {
      case 'exhausted':
        return `Immediate creative refresh needed. Frequency ${frequency.toFixed(1)} is critically high.`;
      case 'critical':
        return `Schedule new creative within 24-48h. Consider rotating ad variants.`;
      case 'warning':
        return `Monitor closely. Prepare backup creatives for rotation.`;
      default:
        return 'Creative is performing well.';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: BUDGET PACING
  // ═══════════════════════════════════════════════════════════════════════════

  private async checkBudgetPacing(
    workspaceId: string,
    campaigns: CampaignWithChanges[],
  ): Promise<FullMorningBriefData['budgetPacing']> {
    const warnings: FullMorningBriefData['budgetPacing'] = [];

    for (const c of campaigns) {
      if (c.status !== 'active') continue;

      const dailyBudget = c.daily_budget ?? c.lifetime_budget ?? 0;
      if (dailyBudget <= 0) continue;

      const spentYesterday = c.yesterdayMetrics.spend;
      const spentToday = c.spend ?? 0; // Current spend from campaign record
      const pacingPct = dailyBudget > 0 ? (spentYesterday / dailyBudget) * 100 : 0;

      // Determine status
      let status: 'on_track' | 'warning' | 'critical' | 'underspend' = 'on_track';
      if (pacingPct >= BUDGET_PACING_CRITICAL_PCT) {
        status = 'critical';
      } else if (pacingPct >= BUDGET_PACING_WARNING_PCT) {
        status = 'warning';
      } else if (pacingPct < 30 && spentYesterday > 0) {
        status = 'underspend';
      }

      // Only report non-healthy campaigns, or all if in warning/critical
      if (status !== 'on_track') {
        // Calculate projected spend
        const hourOfDay = new Date().getHours();
        const projectedSpend = hourOfDay > 0 ? (spentToday / hourOfDay) * 24 : spentToday;

        warnings.push({
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          dailyBudget,
          spentToday,
          spentYesterday,
          pacingPct: Math.round(pacingPct * 10) / 10,
          projectedSpend: Math.round(projectedSpend * 100) / 100,
          status,
          daysRemaining: c.end_date
            ? Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : undefined,
        });
      }
    }

    // Sort: critical first, then warning, then underspend
    const statusOrder = { critical: 0, warning: 1, underspend: 2, on_track: 3 };
    return warnings.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: PENDING DRAFTS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getPendingDrafts(workspaceId: string): Promise<FullMorningBriefData['draftsPending']> {
    try {
      const { data: drafts } = await supabase
        .from('drafts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      return (drafts ?? []).map((d: Draft) => ({
        draftId: d.id,
        campaignName: d.campaign_name ?? 'Unknown Campaign',
        type: d.draft_type,
        summary: d.change_summary,
        proposedBy: d.actor_name ?? d.actor_type ?? 'AI',
        estimatedImpact: d.impact_estimate ?? undefined,
        createdAt: d.created_at,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message, workspaceId }, '[MorningBrief] Failed to fetch pending drafts');
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: SCHEDULED EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getScheduledEvents(
    workspaceId: string,
    timezone: string,
  ): Promise<FullMorningBriefData['scheduledEvents']> {
    const events: FullMorningBriefData['scheduledEvents'] = [];
    const today = new Date();

    try {
      // Fetch scheduled drafts (to be executed today)
      const { data: scheduledDrafts } = await supabase
        .from('drafts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', today.toISOString().slice(0, 10))
        .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      for (const d of (scheduledDrafts ?? [])) {
        events.push({
          type: 'draft_execution',
          title: `Draft: ${d.change_summary}`,
          description: `${d.actor_name ?? 'AI'} scheduled ${d.draft_type} on ${d.campaign_name ?? 'campaign'}`,
          scheduledAt: d.scheduled_at ?? d.created_at,
        });
      }

      // Fetch campaigns starting/ending today
      const todayStr = today.toISOString().slice(0, 10);
      const { data: campaignsStarting } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('start_date', todayStr)
        .lt('start_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      for (const c of (campaignsStarting ?? [])) {
        events.push({
          type: 'campaign_start',
          title: `Campaign starts: ${c.name}`,
          description: `${c.platform} campaign launching today`,
          scheduledAt: c.start_date ?? todayStr,
        });
      }

      const { data: campaignsEnding } = await supabase
        .from('campaigns')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('end_date', todayStr)
        .lt('end_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      for (const c of (campaignsEnding ?? [])) {
        events.push({
          type: 'campaign_end',
          title: `Campaign ends: ${c.name}`,
          description: `${c.platform} campaign ending today — review performance`,
          scheduledAt: c.end_date ?? todayStr,
        });
      }

      // Sort by scheduled time
      return events.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message, workspaceId }, '[MorningBrief] Failed to fetch scheduled events');
      return events;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  private buildExecutiveSummary(
    kpis: FullMorningBriefData['kpis'],
    winners: FullMorningBriefData['topWinners'],
    losers: FullMorningBriefData['topLosers'],
    anomalies: FullMorningBriefData['anomalies'],
    aiBrief: AIMorningBrief | null,
  ): string[] {
    const insights: string[] = [];

    // Use AI headline if available
    if (aiBrief?.headline) {
      insights.push(aiBrief.headline);
    }

    // Overall performance direction
    if (kpis.roas.change > 5) {
      insights.push(`Strong day: ROAS up ${kpis.roas.change}% to ${kpis.roas.value}x with $${kpis.spend.value.toLocaleString()} in spend.`);
    } else if (kpis.roas.change < -10) {
      insights.push(`ROAS declined ${Math.abs(kpis.roas.change)}% to ${kpis.roas.value}x — review underperforming campaigns below.`);
    } else {
      insights.push(`Performance stable: ROAS at ${kpis.roas.value}x, spend at $${kpis.spend.value.toLocaleString()}.`);
    }

    // Top winner highlight
    if (winners.length > 0) {
      const top = winners[0];
      insights.push(`${top.campaignName} led gains with +${top.change}% ${top.metric.toLowerCase()} improvement.`);
    }

    // Anomaly alert
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      insights.push(`⚠️ ${criticalAnomalies.length} critical anomaly(s) detected requiring immediate attention.`);
    } else if (anomalies.length > 0) {
      insights.push(`${anomalies.length} performance anomaly(s) flagged for review.`);
    }

    // CPA direction
    if (kpis.cpa.change < -10) {
      insights.push(`CPA improved ${Math.abs(kpis.cpa.change)}% to $${kpis.cpa.value} — efficient spend management.`);
    } else if (kpis.cpa.change > 15) {
      insights.push(`CPA rose ${kpis.cpa.change}% to $${kpis.cpa.value} — consider reviewing targeting and creative.`);
    }

    // Return top 3
    return insights.slice(0, 3);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getUsersWithMorningBriefEnabled(): Promise<UserTimezoneRow[]> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          user_id,
          email,
          workspace_id,
          timezone,
          morning_brief_enabled,
          morning_brief_time,
          slack_webhook_url
        `)
        .eq('morning_brief_enabled', true);

      if (error) {
        logger.error({ error: error.message }, '[MorningBrief] Failed to fetch user settings');
        return [];
      }

      return (data ?? []) as UserTimezoneRow[];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message }, '[MorningBrief] Error fetching users');
      return [];
    }
  }

  private async getUsersInTimezone(timezone: string): Promise<UserTimezoneRow[]> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          user_id,
          email,
          workspace_id,
          timezone,
          morning_brief_enabled,
          morning_brief_time,
          slack_webhook_url
        `)
        .eq('timezone', timezone)
        .eq('morning_brief_enabled', true);

      if (error) {
        logger.error({ error: error.message, timezone }, '[MorningBrief] Failed to fetch users for timezone');
        return [];
      }

      return (data ?? []) as UserTimezoneRow[];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, timezone }, '[MorningBrief] Error fetching users by timezone');
      return [];
    }
  }

  private async getUserRow(userId: string, workspaceId: string): Promise<UserTimezoneRow | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !data) return null;
      return data as UserTimezoneRow;
    } catch {
      return null;
    }
  }

  private async getWorkspaceName(workspaceId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single();

      if (error || !data) return 'Workspace';
      return data.name as string;
    } catch {
      return 'Workspace';
    }
  }

  private async logBriefDelivery(
    userId: string,
    workspaceId: string,
    brief: FullMorningBriefData,
    durationMs: number,
  ): Promise<void> {
    try {
      await supabase.from('audit_log').insert({
        workspace_id: workspaceId,
        actor_type: 'system',
        actor_name: 'morning-brief-worker',
        action: 'morning_brief_delivered',
        action_category: 'automation',
        details: {
          user_id: userId,
          campaigns_analyzed: brief.platformBreakdown.length,
          recommendations: brief.aiRecommendations.length,
          anomalies: brief.anomalies.length,
          fatigue_alerts: brief.creativeFatigue.length,
          budget_alerts: brief.budgetPacing.length,
          draft_count: brief.draftsPending.length,
          duration_ms: durationMs,
          ai_brief_generated: !!brief.aiBrief,
        },
        source: 'morning-brief-worker',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn({ error: err.message }, '[MorningBrief] Failed to log delivery');
    }
  }
}

// ─── BullMQ Worker Factory ───────────────────────────────────────────────────

/**
 * Create the BullMQ worker for processing morning brief jobs.
 * This handles the actual execution of queued brief generation tasks.
 */
export function createMorningBriefWorker(): Worker {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const processor = new MorningBriefWorker();

  const worker = new Worker(
    MORNING_BRIEF_QUEUE_NAME,
    async (job: Job<MorningBriefJobData>) => {
      await processor.processJob(job);
    },
    {
      connection: redis,
      concurrency: 3,
      limiter: {
        max: 30,
        duration: 60000,
      },
    },
  );

  // ── Event Handlers ──

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, userId: job.data?.userId }, '[MorningBriefWorker] Job completed');
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;

    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || MAX_RETRIES;

    if (attemptsMade >= maxAttempts) {
      logger.error(
        {
          jobId: job.id,
          userId: job.data?.userId,
          error: err.message,
          attemptsMade,
          maxAttempts,
        },
        '[MorningBriefWorker] Job exhausted retries — moving to dead letter queue',
      );

      try {
        await moveToDeadLetterQueue(job.data, err, redis);
      } catch (dlqError) {
        logger.error({ dlqError }, '[MorningBriefWorker] Failed to move to dead letter queue');
      }
    } else {
      logger.warn(
        {
          jobId: job.id,
          userId: job.data?.userId,
          error: err.message,
          attemptsMade,
          maxAttempts,
        },
        '[MorningBriefWorker] Job failed, will retry with exponential backoff',
      );
    }
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, '[MorningBriefWorker] Worker error');
  });

  // ── Graceful Shutdown ──

  process.on('SIGTERM', async () => {
    logger.info('[MorningBriefWorker] SIGTERM received, shutting down...');
    await worker.close();
    await processor.dispose();
  });

  process.on('SIGINT', async () => {
    logger.info('[MorningBriefWorker] SIGINT received, shutting down...');
    await worker.close();
    await processor.dispose();
  });

  logger.info('[MorningBriefWorker] Worker started, listening on queue: %s', MORNING_BRIEF_QUEUE_NAME);
  return worker;
}

// ─── Dead Letter Queue ───────────────────────────────────────────────────────

async function moveToDeadLetterQueue(
  data: MorningBriefJobData,
  error: Error,
  redis: Redis,
): Promise<void> {
  const entry = {
    data,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    failedAt: new Date().toISOString(),
    queue: MORNING_BRIEF_QUEUE_NAME,
  };

  await redis.lpush(DEAD_LETTER_QUEUE_NAME, JSON.stringify(entry));
  await redis.ltrim(DEAD_LETTER_QUEUE_NAME, 0, 999); // Keep last 1000
  await redis.expire(DEAD_LETTER_QUEUE_NAME, 30 * 24 * 60 * 60); // 30-day TTL

  logger.info(
    { userId: data.userId, workspaceId: data.workspaceId },
    '[MorningBriefWorker] Moved to dead letter queue',
  );
}

/**
 * Inspect the dead letter queue — useful for admin dashboards or monitoring.
 */
export async function inspectDeadLetterQueue(limit = 50): Promise<Array<{
  data: MorningBriefJobData;
  error: { message: string; stack?: string; name: string };
  failedAt: string;
}>> {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  try {
    const entries = await redis.lrange(DEAD_LETTER_QUEUE_NAME, 0, limit - 1);
    return entries.map((e) => JSON.parse(e));
  } finally {
    await redis.quit();
  }
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function checkMorningBriefHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, unknown>;
}> {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  try {
    await redis.ping();

    const queueDepth = await redis.llen(`bull:${MORNING_BRIEF_QUEUE_NAME}:wait`);
    const active = await redis.llen(`bull:${MORNING_BRIEF_QUEUE_NAME}:active`);
    const failed = await redis.llen(`bull:${MORNING_BRIEF_QUEUE_NAME}:failed`);
    const deadLetter = await redis.llen(DEAD_LETTER_QUEUE_NAME);

    const isHealthy = (queueDepth as number) < 100 && (failed as number) < 10;
    const isDegraded = (queueDepth as number) < 500 && (failed as number) < 50;

    return {
      status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
      details: {
        queue: MORNING_BRIEF_QUEUE_NAME,
        queueDepth,
        activeJobs: active,
        failedJobs: failed,
        deadLetterQueue: deadLetter,
        redis: 'connected',
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      status: 'unhealthy',
      details: { error: err.message, redis: 'disconnected' },
    };
  } finally {
    await redis.quit();
  }
}

// ─── Manual Trigger ──────────────────────────────────────────────────────────

/**
 * Manually trigger a morning brief for a specific user.
 * Useful for testing or on-demand generation.
 */
export async function triggerMorningBrief(
  userId: string,
  workspaceId: string,
): Promise<string> {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue(MORNING_BRIEF_QUEUE_NAME, { connection: redis });

  try {
    // Fetch user info for the job
    const { data: user } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    const job = await queue.add(
      'generate-and-send',
      {
        userId,
        workspaceId,
        email: (user as UserTimezoneRow | null)?.email ?? '',
        timezone: (user as UserTimezoneRow | null)?.timezone ?? 'UTC',
        slackWebhookUrl: (user as UserTimezoneRow | null)?.slack_webhook_url ?? undefined,
      } as MorningBriefJobData,
      {
        jobId: `morning-brief-manual-${userId}-${Date.now()}`,
        priority: 1,
      },
    );

    logger.info({ jobId: job.id, userId, workspaceId }, '[MorningBrief] Manually triggered');
    return job.id as string;
  } finally {
    await queue.close();
    await redis.quit();
  }
}

// ─── Startup Scheduler ───────────────────────────────────────────────────────

/**
 * Start the morning brief scheduler service.
 * Initializes timezone-aware cron jobs for all enabled users.
 */
export async function startMorningBriefScheduler(): Promise<MorningBriefWorker> {
  const scheduler = new MorningBriefWorker();
  await scheduler.initialize();
  logger.info('[MorningBrief] Scheduler started');
  return scheduler;
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default MorningBriefWorker;
