/**
 * Campaign Sync Worker
 * ====================
 * Syncs campaign data from all connected ad platforms into the database.
 * Runs every 15 minutes via BullMQ cron job.
 *
 * Pipeline (per workspace):
 *   1. Fetch campaigns from platform API (incremental — since last sync)
 *   2. Upsert into campaigns table (conflict: platform wins)
 *   3. Fetch ads for each campaign
 *   4. Upsert into ads table (conflict: platform wins)
 *   5. Fetch metrics for each campaign
 *   6. Upsert into campaign_metrics table
 *   7. Publish real-time events for changes
 *   8. Log sync results to sync_history
 */

import { Queue, Worker, Job, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = 'meta_ads' | 'google_ads' | 'tiktok' | 'linkedin' | 'twitter' | 'snapchat';

export interface SyncResult {
  workspaceId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  platforms: PlatformSyncResult[];
  totalCampaignsSynced: number;
  totalAdsSynced: number;
  totalMetricsSynced: number;
  errors: SyncError[];
  status: 'success' | 'partial' | 'failed';
}

export interface PlatformSyncResult {
  platform: Platform;
  status: 'success' | 'failed' | 'rate_limited' | 'skipped';
  campaignsSynced: number;
  campaignsCreated: number;
  campaignsUpdated: number;
  adsSynced: number;
  adsCreated: number;
  adsUpdated: number;
  metricsSynced: number;
  durationMs: number;
  error?: string;
  retryAfterMs?: number;
}

export interface SyncError {
  platform: Platform;
  phase: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface SyncHistoryEntry {
  id: string;
  workspaceId: string;
  platform: Platform;
  startedAt: Date;
  finishedAt: Date;
  campaignsChanged: number;
  adsChanged: number;
  metricsChanged: number;
  status: 'success' | 'failed' | 'partial';
  errorLog?: string;
  metadata?: Record<string, unknown>;
}

/** External campaign shape returned by platform SDKs */
export interface ExternalCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | string;
  objective?: string;
  budget?: { amount: number; type: 'daily' | 'lifetime' };
  startDate?: string;
  endDate?: string;
  platform: Platform;
  externalId: string;
  updatedAt: string; // ISO-8601 from platform
  raw: Record<string, unknown>;
}

/** External ad shape returned by platform SDKs */
export interface ExternalAd {
  id: string;
  campaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | string;
  creative?: Record<string, unknown>;
  platform: Platform;
  externalId: string;
  updatedAt: string;
  raw: Record<string, unknown>;
}

/** External metrics shape returned by platform SDKs */
export interface ExternalMetrics {
  campaignId: string;
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  platform: Platform;
  raw: Record<string, unknown>;
}

/** Internal DB row shapes */
export interface CampaignRow {
  id: string;
  workspace_id: string;
  platform: Platform;
  external_id: string;
  name: string;
  status: string;
  objective?: string;
  budget_amount?: number;
  budget_type?: string;
  start_date?: Date;
  end_date?: Date;
  raw_data: Record<string, unknown>;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AdRow {
  id: string;
  workspace_id: string;
  campaign_id: string;
  platform: Platform;
  external_id: string;
  name: string;
  status: string;
  creative_data: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignMetricsRow {
  id: string;
  campaign_id: string;
  workspace_id: string;
  platform: Platform;
  date: Date;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  raw_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectedAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
  lastSyncedAt?: Date;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_CRON = '*/15 * * * *'; // Every 15 minutes
const SYNC_JOB_NAME = 'campaign-sync:workspace';
const QUEUE_NAME = 'campaign-sync';
const DEFAULT_SYNC_DAYS = 30;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;
const RATE_LIMIT_BUFFER = 5; // Keep this many requests as buffer
const SYNC_BATCH_SIZE = 50;
const METRICS_BATCH_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM RATE LIMITS (requests per minute)
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_RATE_LIMITS: Record<Platform, { requestsPerMinute: number; windowMs: number }> = {
  meta_ads: { requestsPerMinute: 200, windowMs: 60_000 },
  google_ads: { requestsPerMinute: 10_000, windowMs: 60_000 },
  tiktok: { requestsPerMinute: 60, windowMs: 60_000 },
  linkedin: { requestsPerMinute: 100, windowMs: 60_000 },
  twitter: { requestsPerMinute: 300, windowMs: 60_000 },
  snapchat: { requestsPerMinute: 60, windowMs: 60_000 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ABSTRACT PLATFORM ADAPTER (injected — implementations live elsewhere)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformAdapter {
  fetchCampaigns(account: ConnectedAccount, since?: Date): Promise<ExternalCampaign[]>;
  fetchAds(account: ConnectedAccount, campaignExternalIds: string[]): Promise<ExternalAd[]>;
  fetchMetrics(
    account: ConnectedAccount,
    campaignExternalIds: string[],
    startDate: string,
    endDate: string
  ): Promise<ExternalMetrics[]>;
  getRateLimitStatus(account: ConnectedAccount): Promise<{ remaining: number; resetAt: Date }>;
  refreshTokenIfNeeded(account: ConnectedAccount): Promise<ConnectedAccount>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE REPOSITORY (abstract — implementations live in db/)
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncRepository {
  // Campaigns
  upsertCampaign(row: Partial<CampaignRow> & { external_id: string; workspace_id: string; platform: Platform }): Promise<{ id: string; created: boolean }>;
  getCampaignsByWorkspace(workspaceId: string): Promise<CampaignRow[]>;
  getCampaignByExternalId(workspaceId: string, platform: Platform, externalId: string): Promise<CampaignRow | null>;

  // Ads
  upsertAd(row: Partial<AdRow> & { external_id: string; campaign_id: string; workspace_id: string; platform: Platform }): Promise<{ id: string; created: boolean }>;

  // Metrics
  upsertMetrics(row: Partial<CampaignMetricsRow> & { campaign_id: string; date: Date; platform: Platform }): Promise<{ id: string; created: boolean }>;

  // Accounts
  getConnectedAccounts(workspaceId: string): Promise<ConnectedAccount[]>;
  updateAccountSyncTimestamp(accountId: string, timestamp: Date): Promise<void>;
  updateAccountRateLimit(accountId: string, remaining: number, resetAt: Date): Promise<void>;

  // Sync History
  insertSyncHistory(entry: Omit<SyncHistoryEntry, 'id'>): Promise<SyncHistoryEntry>;
  getLastSyncForWorkspace(workspaceId: string, platform: Platform): Promise<Date | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUS (for real-time updates)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventBus {
  publish(channel: string, payload: Record<string, unknown>): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER (token-bucket per platform per workspace)
// ─────────────────────────────────────────────────────────────────────────────

export class PlatformRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(private limits: Record<Platform, { requestsPerMinute: number; windowMs: number }>) {}

  private key(workspaceId: string, platform: Platform): string {
    return `${workspaceId}:${platform}`;
  }

  async acquire(workspaceId: string, platform: Platform, tokens = 1): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const key = this.key(workspaceId, platform);
    const limit = this.limits[platform];
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: limit.requestsPerMinute - RATE_LIMIT_BUFFER, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (elapsedMs / limit.windowMs) * limit.requestsPerMinute;
    bucket.tokens = Math.min(limit.requestsPerMinute - RATE_LIMIT_BUFFER, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true };
    }

    const deficit = tokens - bucket.tokens;
    const retryAfterMs = (deficit / limit.requestsPerMinute) * limit.windowMs;
    return { allowed: false, retryAfterMs: Math.ceil(retryAfterMs) };
  }

  async release(workspaceId: string, platform: Platform, tokens = 1): Promise<void> {
    const key = this.key(workspaceId, platform);
    const limit = this.limits[platform];
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.tokens = Math.min(limit.requestsPerMinute - RATE_LIMIT_BUFFER, bucket.tokens + tokens);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN SYNC WORKER
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignSyncWorkerOptions {
  repository: SyncRepository;
  adapters: Record<Platform, PlatformAdapter>;
  eventBus: EventBus;
  redis: IORedis;
  logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
  onError?: (error: Error, context: { workspaceId: string; platform?: Platform; phase: string }) => void;
}

export class CampaignSyncWorker {
  private rateLimiter: PlatformRateLimiter;
  private logger: NonNullable<CampaignSyncWorkerOptions['logger']>;
  private events: EventEmitter;

  constructor(private opts: CampaignSyncWorkerOptions) {
    this.rateLimiter = new PlatformRateLimiter(PLATFORM_RATE_LIMITS);
    this.logger = opts.logger ?? console;
    this.events = new EventEmitter();
  }

  // ── Event subscription helpers ───────────────────────────────────────────

  onCampaignCreated(handler: (payload: { workspaceId: string; campaign: CampaignRow }) => void): void {
    this.events.on('campaign:created', handler);
  }

  onCampaignUpdated(handler: (payload: { workspaceId: string; campaign: CampaignRow; changes: string[] }) => void): void {
    this.events.on('campaign:updated', handler);
  }

  onSyncComplete(handler: (result: SyncResult) => void): void {
    this.events.on('sync:complete', handler);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Sync all connected platforms for a workspace.
   * Error isolation: one platform failure does not stop others.
   */
  async syncWorkspace(workspaceId: string): Promise<SyncResult> {
    const startedAt = new Date();
    const startTs = Date.now();
    this.logger.info(`[Sync] Starting workspace sync`, { workspaceId, startedAt: startedAt.toISOString() });

    const accounts = await this.opts.repository.getConnectedAccounts(workspaceId);
    const activeAccounts = accounts.filter((a) => a.isActive);

    if (activeAccounts.length === 0) {
      this.logger.warn(`[Sync] No active accounts for workspace`, { workspaceId });
      return {
        workspaceId,
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startTs,
        platforms: [],
        totalCampaignsSynced: 0,
        totalAdsSynced: 0,
        totalMetricsSynced: 0,
        errors: [],
        status: 'success',
      };
    }

    const errors: SyncError[] = [];
    const platformResults: PlatformSyncResult[] = [];
    let totalCampaigns = 0;
    let totalAds = 0;
    let totalMetrics = 0;

    // Process each platform in parallel with error isolation
    const platformPromises = activeAccounts.map(async (account) => {
      try {
        const result = await this.syncPlatform(workspaceId, account.platform);
        platformResults.push(result);
        totalCampaigns += result.campaignsSynced;
        totalAds += result.adsSynced;
        totalMetrics += result.metricsSynced;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[Sync] Platform sync failed`, {
          workspaceId,
          platform: account.platform,
          error: err.message,
        });
        errors.push({
          platform: account.platform,
          phase: 'platform_sync',
          message: err.message,
          timestamp: new Date(),
          retryable: this.isRetryableError(err),
        });
        platformResults.push({
          platform: account.platform,
          status: 'failed',
          campaignsSynced: 0,
          campaignsCreated: 0,
          campaignsUpdated: 0,
          adsSynced: 0,
          adsCreated: 0,
          adsUpdated: 0,
          metricsSynced: 0,
          durationMs: 0,
          error: err.message,
        });
      }
    });

    await Promise.allSettled(platformPromises);

    const finishedAt = new Date();
    const durationMs = Date.now() - startTs;

    const status: SyncResult['status'] =
      errors.length === 0 ? 'success' : errors.length === activeAccounts.length ? 'failed' : 'partial';

    const result: SyncResult = {
      workspaceId,
      startedAt,
      finishedAt,
      durationMs,
      platforms: platformResults,
      totalCampaignsSynced: totalCampaigns,
      totalAdsSynced: totalAds,
      totalMetricsSynced: totalMetrics,
      errors,
      status,
    };

    this.logger.info(`[Sync] Workspace sync complete`, {
      workspaceId,
      status,
      durationMs,
      totalCampaigns,
      totalAds,
      totalMetrics,
      errorCount: errors.length,
    });

    this.events.emit('sync:complete', result);
    return result;
  }

  /**
   * Sync a single platform for a workspace (incremental).
   */
  async syncPlatform(workspaceId: string, platform: Platform): Promise<PlatformSyncResult> {
    const platformStart = Date.now();
    this.logger.info(`[Sync] Starting platform sync`, { workspaceId, platform });

    const adapter = this.opts.adapters[platform];
    if (!adapter) {
      throw new Error(`No adapter configured for platform: ${platform}`);
    }

    // ── Rate limit check ──
    const rateCheck = await this.rateLimiter.acquire(workspaceId, platform, 1);
    if (!rateCheck.allowed) {
      this.logger.warn(`[Sync] Rate limited`, { workspaceId, platform, retryAfterMs: rateCheck.retryAfterMs });
      return {
        platform,
        status: 'rate_limited',
        campaignsSynced: 0,
        campaignsCreated: 0,
        campaignsUpdated: 0,
        adsSynced: 0,
        adsCreated: 0,
        adsUpdated: 0,
        metricsSynced: 0,
        durationMs: Date.now() - platformStart,
        retryAfterMs: rateCheck.retryAfterMs,
      };
    }

    // ── Get account & refresh token ──
    const accounts = await this.opts.repository.getConnectedAccounts(workspaceId);
    const account = accounts.find((a) => a.platform === platform && a.isActive);
    if (!account) {
      return {
        platform,
        status: 'skipped',
        campaignsSynced: 0,
        campaignsCreated: 0,
        campaignsUpdated: 0,
        adsSynced: 0,
        adsCreated: 0,
        adsUpdated: 0,
        metricsSynced: 0,
        durationMs: Date.now() - platformStart,
      };
    }

    const refreshedAccount = await adapter.refreshTokenIfNeeded(account);

    // ── Determine incremental sync window ──
    const lastSyncedAt = await this.opts.repository.getLastSyncForWorkspace(workspaceId, platform);

    // ── 1. Fetch campaigns (incremental) ──
    const campaignsFetchStart = Date.now();
    const externalCampaigns = await adapter.fetchCampaigns(refreshedAccount, lastSyncedAt ?? undefined);
    this.logger.debug(`[Sync] Fetched campaigns`, {
      workspaceId,
      platform,
      count: externalCampaigns.length,
      durationMs: Date.now() - campaignsFetchStart,
    });

    // ── 2. Upsert campaigns (conflict: platform wins) ──
    let campaignsCreated = 0;
    let campaignsUpdated = 0;
    const campaignExternalIds: string[] = [];
    const changedCampaigns: Array<{ row: CampaignRow; isNew: boolean; changes: string[] }> = [];

    for (const ext of externalCampaigns) {
      const existing = await this.opts.repository.getCampaignByExternalId(workspaceId, platform, ext.externalId);
      const changes = existing ? this.detectChanges(existing, ext) : [];

      const { id: campaignId, created } = await this.opts.repository.upsertCampaign({
        workspace_id: workspaceId,
        platform,
        external_id: ext.externalId,
        name: ext.name,
        status: ext.status,
        objective: ext.objective,
        budget_amount: ext.budget?.amount,
        budget_type: ext.budget?.type,
        start_date: ext.startDate ? new Date(ext.startDate) : undefined,
        end_date: ext.endDate ? new Date(ext.endDate) : undefined,
        raw_data: ext.raw,
        last_synced_at: new Date(),
      });

      if (created) campaignsCreated++;
      else if (changes.length > 0) campaignsUpdated++;

      campaignExternalIds.push(ext.externalId);

      // Track changes for event publishing
      const row = (await this.opts.repository.getCampaignByExternalId(workspaceId, platform, ext.externalId))!;
      changedCampaigns.push({ row, isNew: created, changes });

      // Publish real-time events
      if (created) {
        await this.publishEvent('campaign:created', { workspaceId, campaign: row });
        this.events.emit('campaign:created', { workspaceId, campaign: row });
      } else if (changes.length > 0) {
        await this.publishEvent('campaign:updated', { workspaceId, campaign: row, changes });
        this.events.emit('campaign:updated', { workspaceId, campaign: row, changes });
      }
    }

    // ── 3. Fetch ads for each campaign (batched) ──
    const adsFetchStart = Date.now();
    let allExternalAds: ExternalAd[] = [];
    for (let i = 0; i < campaignExternalIds.length; i += SYNC_BATCH_SIZE) {
      const batch = campaignExternalIds.slice(i, i + SYNC_BATCH_SIZE);
      const batchAds = await adapter.fetchAds(refreshedAccount, batch);
      allExternalAds.push(...batchAds);

      // Rate limit check between batches
      if (i + SYNC_BATCH_SIZE < campaignExternalIds.length) {
        const check = await this.rateLimiter.acquire(workspaceId, platform, 1);
        if (!check.allowed) {
          this.logger.warn(`[Sync] Rate limited during ad fetch`, { workspaceId, platform });
          break;
        }
      }
    }
    this.logger.debug(`[Sync] Fetched ads`, {
      workspaceId,
      platform,
      count: allExternalAds.length,
      durationMs: Date.now() - adsFetchStart,
    });

    // ── 4. Upsert ads (conflict: platform wins) ──
    let adsCreated = 0;
    let adsUpdated = 0;
    for (const ext of allExternalAds) {
      const { created } = await this.opts.repository.upsertAd({
        workspace_id: workspaceId,
        campaign_id: ext.campaignId,
        platform,
        external_id: ext.externalId,
        name: ext.name,
        status: ext.status,
        creative_data: ext.creative ?? {},
        raw_data: ext.raw,
        last_synced_at: new Date(),
      });
      if (created) adsCreated++;
      else adsUpdated++;
    }

    // ── 5. Fetch metrics for each campaign ──
    const metricsFetchStart = Date.now();
    let allMetrics: ExternalMetrics[] = [];
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - DEFAULT_SYNC_DAYS * 86400000).toISOString().split('T')[0];

    for (let i = 0; i < campaignExternalIds.length; i += METRICS_BATCH_SIZE) {
      const batch = campaignExternalIds.slice(i, i + METRICS_BATCH_SIZE);
      const batchMetrics = await adapter.fetchMetrics(refreshedAccount, batch, startDate, endDate);
      allMetrics.push(...batchMetrics);

      // Rate limit check between batches
      if (i + METRICS_BATCH_SIZE < campaignExternalIds.length) {
        const check = await this.rateLimiter.acquire(workspaceId, platform, 1);
        if (!check.allowed) {
          this.logger.warn(`[Sync] Rate limited during metrics fetch`, { workspaceId, platform });
          break;
        }
      }
    }
    this.logger.debug(`[Sync] Fetched metrics`, {
      workspaceId,
      platform,
      count: allMetrics.length,
      durationMs: Date.now() - metricsFetchStart,
    });

    // ── 6. Upsert metrics ──
    let metricsSynced = 0;
    for (const ext of allMetrics) {
      await this.opts.repository.upsertMetrics({
        campaign_id: ext.campaignId,
        workspace_id: workspaceId,
        platform,
        date: new Date(ext.date),
        impressions: ext.impressions,
        clicks: ext.clicks,
        spend: ext.spend,
        conversions: ext.conversions,
        ctr: ext.ctr,
        cpc: ext.cpc,
        cpm: ext.cpm,
        raw_data: ext.raw,
      });
      metricsSynced++;
    }

    // ── Update account sync timestamp ──
    const now = new Date();
    await this.opts.repository.updateAccountSyncTimestamp(account.id, now);

    // ── Update rate limit status from adapter ──
    try {
      const rateStatus = await adapter.getRateLimitStatus(refreshedAccount);
      await this.opts.repository.updateAccountRateLimit(account.id, rateStatus.remaining, rateStatus.resetAt);
    } catch {
      // Non-critical; log and continue
      this.logger.debug(`[Sync] Could not update rate limit status`, { workspaceId, platform });
    }

    // ── 7. Log sync history ──
    await this.opts.repository.insertSyncHistory({
      workspaceId,
      platform,
      startedAt: new Date(platformStart),
      finishedAt: new Date(),
      campaignsChanged: campaignsCreated + campaignsUpdated,
      adsChanged: adsCreated + adsUpdated,
      metricsChanged: metricsSynced,
      status: 'success',
      metadata: {
        campaignsCreated,
        campaignsUpdated,
        adsCreated,
        adsUpdated,
        metricsSynced,
        incremental: !!lastSyncedAt,
        lastSyncedAt: lastSyncedAt?.toISOString(),
      },
    });

    const durationMs = Date.now() - platformStart;
    this.logger.info(`[Sync] Platform sync complete`, {
      workspaceId,
      platform,
      durationMs,
      campaigns: campaignsCreated + campaignsUpdated,
      ads: adsCreated + adsUpdated,
      metrics: metricsSynced,
    });

    return {
      platform,
      status: 'success',
      campaignsSynced: campaignsCreated + campaignsUpdated,
      campaignsCreated,
      campaignsUpdated,
      adsSynced: adsCreated + adsUpdated,
      adsCreated,
      adsUpdated,
      metricsSynced,
      durationMs,
    };
  }

  /**
   * Sync metrics for a specific campaign over N days.
   */
  async syncCampaignMetrics(campaignId: string, days: number = DEFAULT_SYNC_DAYS): Promise<void> {
    this.logger.info(`[Sync] Syncing campaign metrics`, { campaignId, days });

    const campaigns = await this.opts.repository.getCampaignsByWorkspace(''); // Will filter by campaignId
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const adapter = this.opts.adapters[campaign.platform];
    if (!adapter) {
      throw new Error(`No adapter for platform: ${campaign.platform}`);
    }

    const accounts = await this.opts.repository.getConnectedAccounts(campaign.workspace_id);
    const account = accounts.find((a) => a.platform === campaign.platform && a.isActive);
    if (!account) {
      throw new Error(`No active account for platform: ${campaign.platform}`);
    }

    const refreshedAccount = await adapter.refreshTokenIfNeeded(account);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const metrics = await adapter.fetchMetrics(refreshedAccount, [campaign.external_id], startDate, endDate);

    for (const ext of metrics) {
      await this.opts.repository.upsertMetrics({
        campaign_id: campaignId,
        workspace_id: campaign.workspace_id,
        platform: campaign.platform,
        date: new Date(ext.date),
        impressions: ext.impressions,
        clicks: ext.clicks,
        spend: ext.spend,
        conversions: ext.conversions,
        ctr: ext.ctr,
        cpc: ext.cpc,
        cpm: ext.cpm,
        raw_data: ext.raw,
      });
    }

    this.logger.info(`[Sync] Campaign metrics synced`, { campaignId, metricsCount: metrics.length });
  }

  /**
   * Handle platform-specific errors with retry logic and DLQ tracking.
   */
  async handlePlatformError(
    workspaceId: string,
    platform: Platform,
    error: Error
  ): Promise<void> {
    this.logger.error(`[Sync] Handling platform error`, {
      workspaceId,
      platform,
      error: error.message,
      stack: error.stack,
    });

    const retryable = this.isRetryableError(error);
    const timestamp = new Date();

    // Log to sync_history as failed
    await this.opts.repository.insertSyncHistory({
      workspaceId,
      platform,
      startedAt: timestamp,
      finishedAt: timestamp,
      campaignsChanged: 0,
      adsChanged: 0,
      metricsChanged: 0,
      status: 'failed',
      errorLog: JSON.stringify({
        message: error.message,
        stack: error.stack,
        retryable,
        timestamp: timestamp.toISOString(),
      }),
    });

    // Publish error event for monitoring
    await this.publishEvent('sync:error', {
      workspaceId,
      platform,
      error: error.message,
      retryable,
      timestamp: timestamp.toISOString(),
    });

    // Call optional error handler
    this.opts.onError?.(error, { workspaceId, platform, phase: 'platform_sync' });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Detect field-level changes between existing DB row and incoming platform data.
   * Used for incremental sync event publishing.
   */
  private detectChanges(existing: CampaignRow, incoming: ExternalCampaign): string[] {
    const changes: string[] = [];
    if (existing.name !== incoming.name) changes.push('name');
    if (existing.status !== incoming.status) changes.push('status');
    if (existing.objective !== incoming.objective) changes.push('objective');
    if (existing.budget_amount !== incoming.budget?.amount) changes.push('budget_amount');
    if (existing.budget_type !== incoming.budget?.type) changes.push('budget_type');
    if (String(existing.start_date) !== String(incoming.startDate ? new Date(incoming.startDate) : undefined)) {
      changes.push('start_date');
    }
    if (String(existing.end_date) !== String(incoming.endDate ? new Date(incoming.endDate) : undefined)) {
      changes.push('end_date');
    }
    return changes;
  }

  /**
   * Publish a real-time event via the event bus.
   */
  private async publishEvent(event: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.opts.eventBus.publish(event, payload);
    } catch (err) {
      this.logger.warn(`[Sync] Event publish failed`, { event, error: (err as Error).message });
    }
  }

  /**
   * Determine if an error is retryable (network, rate limit, timeout)
   * vs non-retryable (auth, bad request, not found).
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /rate limit/i,
      /too many requests/i,
      /429/,
      /503/,
      /502/,
      /504/,
      /timeout/i,
      /socket hang up/i,
      /network/i,
    ];
    return retryablePatterns.some((pattern) => pattern.test(error.message));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BULLMQ QUEUE & WORKER FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncQueueConfig {
  redis: IORedis;
  repository: SyncRepository;
  adapters: Record<Platform, PlatformAdapter>;
  eventBus: EventBus;
  logger?: CampaignSyncWorkerOptions['logger'];
  onError?: CampaignSyncWorkerOptions['onError'];
  concurrency?: number;
}

/**
 * Create the BullMQ Queue with recurring cron job.
 */
export function createSyncQueue(config: SyncQueueConfig): Queue {
  const queue = new Queue(QUEUE_NAME, {
    connection: config.redis,
    defaultJobOptions: {
      attempts: MAX_RETRIES,
      backoff: { type: 'exponential', delay: RETRY_BACKOFF_MS },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  return queue;
}

/**
 * Create the BullMQ Worker that processes sync jobs.
 */
export function createSyncWorker(config: SyncQueueConfig): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<{ workspaceId: string; priority?: boolean }>) => {
      const { workspaceId } = job.data;
      const logger = config.logger ?? console;

      logger.info(`[Worker] Processing sync job`, { jobId: job.id, workspaceId, priority: job.data.priority });

      const syncWorker = new CampaignSyncWorker({
        repository: config.repository,
        adapters: config.adapters,
        eventBus: config.eventBus,
        redis: config.redis,
        logger,
        onError: config.onError,
      });

      // Update job progress
      await job.updateProgress({ phase: 'starting', percent: 5 });

      const result = await syncWorker.syncWorkspace(workspaceId);

      await job.updateProgress({ phase: 'complete', percent: 100 });

      logger.info(`[Worker] Sync job complete`, {
        jobId: job.id,
        workspaceId,
        status: result.status,
        durationMs: result.durationMs,
      });

      return result;
    },
    {
      connection: config.redis,
      concurrency: config.concurrency ?? 3,
      limiter: {
        max: 30,
        duration: 60_000, // 30 jobs per minute across all workers
      },
    }
  );

  // ── Event handlers ──

  worker.on('completed', (job, result: SyncResult) => {
    const logger = config.logger ?? console;
    logger.info(`[Worker] Job completed`, {
      jobId: job?.id,
      workspaceId: job?.data?.workspaceId,
      status: result.status,
    });
  });

  worker.on('failed', (job, err) => {
    const logger = config.logger ?? console;
    logger.error(`[Worker] Job failed`, {
      jobId: job?.id,
      workspaceId: job?.data?.workspaceId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('progress', (job, progress) => {
    const logger = config.logger ?? console;
    logger.debug(`[Worker] Job progress`, { jobId: job.id, progress });
  });

  return worker;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER (cron-based recurring sync)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule recurring sync jobs for all workspaces.
 * Call this at application startup.
 */
export async function scheduleRecurringSyncs(
  queue: Queue,
  repository: SyncRepository,
  cron = SYNC_INTERVAL_CRON
): Promise<void> {
  // Remove existing repeatable jobs to avoid duplicates
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Get all workspaces with connected accounts and schedule each
  // NOTE: In production, you'd query your workspaces table
  // This is a placeholder that schedules a global sync job
  await queue.add(
    SYNC_JOB_NAME,
    { workspaceId: 'ALL_WORKSPACES', priority: false },
    {
      repeat: { cron },
      jobId: 'recurring:all-workspaces',
    }
  );
}

/**
 * Schedule an immediate (priority) sync for a specific workspace.
 */
export async function scheduleImmediateSync(
  queue: Queue,
  workspaceId: string
): Promise<Job> {
  return queue.add(
    SYNC_JOB_NAME,
    { workspaceId, priority: true },
    { priority: 1, attempts: MAX_RETRIES }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEAD LETTER QUEUE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const DEAD_LETTER_QUEUE_NAME = 'campaign-sync:dead-letter';

/**
 * Create a dead-letter queue for failed sync jobs that exhaust retries.
 */
export function createDeadLetterQueue(redis: IORedis): Queue {
  return new Queue(DEAD_LETTER_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: false, // Keep DLQ entries for inspection
      removeOnFail: false,
    },
  });
}

/**
 * Create a worker that processes dead-letter items for manual review / alerting.
 */
export function createDeadLetterWorker(
  redis: IORedis,
  opts: { onDeadLetter?: (job: Job, error: Error) => void; logger?: CampaignSyncWorkerOptions['logger'] }
): Worker {
  const logger = opts.logger ?? console;

  return new Worker(
    DEAD_LETTER_QUEUE_NAME,
    async (job: Job) => {
      logger.error(`[DLQ] Processing dead letter`, {
        jobId: job.id,
        workspaceId: job.data?.workspaceId,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
      });

      // Here you could:
      // - Send alert to PagerDuty/Opsgenie
      // - Write to a monitoring table
      // - Notify the workspace owner via email/Slack
      // - Retry with exponential backoff after a long delay

      opts.onDeadLetter?.(job, new Error(job.failedReason ?? 'Unknown failure'));
    },
    { connection: redis, concurrency: 1 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: Wiring everything together (for reference)
// ─────────────────────────────────────────────────────────────────────────────

/*
import Redis from 'ioredis';

const redis = new Redis({ host: process.env.REDIS_HOST, port: 6379 });

// Inject your actual implementations:
const repository: SyncRepository = new PostgresSyncRepository(pool);
const adapters: Record<Platform, PlatformAdapter> = {
  meta_ads: new MetaAdsAdapter(),
  google_ads: new GoogleAdsAdapter(),
  tiktok: new TikTokAdapter(),
  linkedin: new LinkedInAdapter(),
  twitter: new TwitterAdapter(),
  snapchat: new SnapchatAdapter(),
};
const eventBus: EventBus = new RedisEventBus(redis);

// Create queue + worker
const syncQueue = createSyncQueue({ redis, repository, adapters, eventBus });
const syncWorker = createSyncWorker({ redis, repository, adapters, eventBus, concurrency: 5 });

// Schedule recurring syncs
await scheduleRecurringSyncs(syncQueue, repository);

// Schedule an immediate sync
const job = await scheduleImmediateSync(syncQueue, 'workspace_123');

// Dead letter handling
const dlq = createDeadLetterQueue(redis);
const dlqWorker = createDeadLetterWorker(redis, {
  onDeadLetter: (job, err) => {
    // Send alert
  },
});
*/
