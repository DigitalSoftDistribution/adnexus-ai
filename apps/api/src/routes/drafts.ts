/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ADNEXUS — Draft Routes (CORE)                                           ║
 * ║                                                                          ║
 * ║  The draft-first approval workflow is the safety layer of the entire    ║
 * ║  platform. Every change to live campaigns goes through:                  ║
 * ║    1. Draft creation (AI or user)                                       ║
 * ║    2. Human review & approval                                            ║
 * ║    3. Execution via DraftExecutionEngine (validate → snapshot → apply)   ║
 * ║    4. Verification & audit trail                                         ║
 * ║                                                                          ║
 * ║  Endpoints:                                                              ║
 * ║    GET    /drafts          — List drafts with filters, search, stats     ║
 * ║    GET    /drafts/stats    — Draft statistics                            ║
 * ║    GET    /drafts/:id      — Single draft with diff view                 ║
 * ║    POST   /drafts          — Create draft (AI or user)                   ║
 * ║    POST   /drafts/:id/approve — Approve & EXECUTE change (CRITICAL)      ║
 * ║    POST   /drafts/:id/reject  — Reject draft                             ║
 * ║    POST   /drafts/:id/cancel  — Cancel draft (by creator)                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  AppError,
  PlatformAPIError,
} from '../lib/errors';
import { getModuleLogger } from '../lib/logger';
import { EventPublisher } from '../realtime/EventPublisher';
import {
  DraftExecutionEngine,
} from '../draft-engine';
import type {
  DraftStore,
  EngineOptions,
} from '../draft-engine/draft-execution-engine';
import type { CampaignStore } from '../draft-engine/draft-validator';
import type { SnapshotStore } from '../draft-engine/rollback-manager';
import type { LogStore } from '../draft-engine/execution-logger';
import type { PlatformApiClient } from '../draft-engine/change-applier';
import type { ChannelRegistry } from '../draft-engine/notification-dispatcher';
import {
  AdPlatform,
  ChangeType,
  DraftStatus,
  ExecutionStatus,
  type Draft,
  type Campaign,
  type Snapshot,
  type ExecutionLogEntry,
  type ExecutionResult,
  type CampaignBudget,
  type CampaignStatus as EngineCampaignStatus,
  type BidStrategy,
  type TargetingConfig,
  type Creative,
} from '../draft-engine/types';
import type { Campaign as GooglePlatformCampaign } from '../platforms/google/types';
import type { Platform, DraftType, Draft as AppDraft } from '../types';
import { config } from '../config';
import { MetaApiClient } from '../platforms/meta/client';
import { GoogleAdsClient } from '../platforms/google/client';

const router = Router();
const logger = getModuleLogger('drafts-route');

// ───────────────────────────────────────────────────────────────────────────
// Shared Event Publisher (singleton, wired by RealtimeService at boot)
// ───────────────────────────────────────────────────────────────────────────

export const draftEventPublisher = new EventPublisher();

// ───────────────────────────────────────────────────────────────────────────
// Helpers: Supabase-backed engine stores
// ───────────────────────────────────────────────────────────────────────────

function createSupabaseDraftStore(): DraftStore {
  return {
    async getById(id: string): Promise<Draft | null> {
      // Join the campaign so the engine gets the REAL platform_campaign_id
      // (the external id the platform API needs) rather than falling back to
      // the internal UUID.
      const { data, error } = await supabase
        .from('drafts')
        .select('*, campaigns!left(platform_campaign_id, name, status)')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return mapDbDraftToEngineDraft(data as AppDraft);
    },

    async updateStatus(id: string, status: DraftStatus): Promise<void> {
      const mapped = mapEngineStatusToDbStatus(status);
      const { error } = await supabase
        .from('drafts')
        .update({ status: mapped })
        .eq('id', id);
      if (error) throw new Error(`Failed to update draft status: ${error.message}`);
    },

    async updateExecutionLog(_id: string, _result: ExecutionResult): Promise<void> {
      // Execution logs stored via LogStore (separate table)
      // This is handled by ExecutionLogger directly
    },

    async listPending(): Promise<Draft[]> {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return (data as AppDraft[]).map(mapDbDraftToEngineDraft);
    },
  };
}

function createSupabaseCampaignStore(): CampaignStore {
  return {
    async getCampaign(id: string): Promise<Campaign | null> {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return mapDbCampaignToEngineCampaign(data);
    },

    async getCampaignByExternalId(externalId: string, platform: AdPlatform): Promise<Campaign | null> {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, ad_accounts!inner(platform)')
        .eq('platform_campaign_id', externalId)
        .eq('ad_accounts.platform', platform)
        .single();
      if (error || !data) return null;
      return mapDbCampaignToEngineCampaign(data);
    },
  };
}

function createSupabaseSnapshotStore(): SnapshotStore {
  return {
    async saveSnapshot(snapshot: Snapshot): Promise<void> {
      const { error } = await supabase.from('draft_snapshots').insert({
        id: snapshot.id,
        draft_id: snapshot.draftId,
        campaign_id: snapshot.campaignId,
        created_at: snapshot.createdAt.toISOString(),
        full_state: snapshot.fullState,
        state_hash: snapshot.stateHash,
        change_type: snapshot.changeType,
      });
      if (error) throw new Error(`Failed to save snapshot: ${error.message}`);
    },

    async getSnapshot(id: string): Promise<Snapshot | null> {
      const { data, error } = await supabase
        .from('draft_snapshots')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return {
        id: data.id,
        draftId: data.draft_id,
        campaignId: data.campaign_id,
        createdAt: new Date(data.created_at),
        fullState: data.full_state,
        stateHash: data.state_hash,
        changeType: data.change_type as ChangeType,
      };
    },

    async getSnapshotByDraftId(draftId: string): Promise<Snapshot | null> {
      const { data, error } = await supabase
        .from('draft_snapshots')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return {
        id: data.id,
        draftId: data.draft_id,
        campaignId: data.campaign_id,
        createdAt: new Date(data.created_at),
        fullState: data.full_state,
        stateHash: data.state_hash,
        changeType: data.change_type as ChangeType,
      };
    },
  };
}

function createSupabaseLogStore(): LogStore {
  return {
    async insert(entry: ExecutionLogEntry): Promise<void> {
      const { error } = await supabase.from('execution_logs').insert({
        id: entry.id,
        draft_id: entry.draftId,
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        step: entry.step,
        metadata: entry.metadata ?? {},
        error: entry.error ?? null,
      });
      if (error) {
        // Non-critical: don't throw, just log
        logger.warn({ error }, 'Failed to insert execution log');
      }
    },

    async find(filter: { draftId?: string; campaignId?: string; status?: ExecutionStatus; startDate?: Date; endDate?: Date; platform?: AdPlatform }): Promise<ExecutionLogEntry[]> {
      let query = supabase.from('execution_logs').select('*').order('timestamp', { ascending: false });
      if (filter.draftId) query = query.eq('draft_id', filter.draftId);
      if (filter.startDate) query = query.gte('timestamp', filter.startDate.toISOString());
      if (filter.endDate) query = query.lte('timestamp', filter.endDate.toISOString());
      const { data, error } = await query.limit(500);
      if (error || !data) return [];
      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        draftId: row.draft_id as string,
        timestamp: new Date(row.timestamp as string),
        level: row.level as ExecutionLogEntry['level'],
        message: row.message as string,
        step: row.step as string,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        error: row.error as ExecutionLogEntry['error'] ?? undefined,
      }));
    },

    async findByDraftId(draftId: string): Promise<ExecutionLogEntry[]> {
      return this.find({ draftId });
    },

    async findLatest(draftId: string): Promise<ExecutionLogEntry | null> {
      const { data, error } = await supabase
        .from('execution_logs')
        .select('*')
        .eq('draft_id', draftId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return {
        id: data.id as string,
        draftId: data.draft_id as string,
        timestamp: new Date(data.timestamp as string),
        level: data.level as ExecutionLogEntry['level'],
        message: data.message as string,
        step: data.step as string,
        metadata: (data.metadata as Record<string, unknown>) ?? {},
        error: data.error as ExecutionLogEntry['error'] ?? undefined,
      };
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Platform API Client Factory
// ───────────────────────────────────────────────────────────────────────────

/** Build a PlatformApiClient adapter for the DraftExecutionEngine.
 *  Currently supports Meta (Facebook/Instagram) Ads.
 */
async function getPlatformClient(platform: AdPlatform, workspaceId: string): Promise<PlatformApiClient> {
  const { data: account } = await supabase
    .from('ad_accounts')
    .select('oauth_token, platform_account_id, refresh_token')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .limit(1)
    .single();

  const token = account?.oauth_token;
  if (!token) {
    throw new PlatformAPIError(platform, `No connected ${platform} account with valid token found`);
  }

  // ── Google Ads ──
  if (platform === AdPlatform.GOOGLE) {
    return createGooglePlatformClient(account.platform_account_id, token, account.refresh_token);
  }

  // ── Meta (default) ──
  const metaClient = new MetaApiClient({
    oauth: {
      clientId: config.meta.appId || 'dummy',
      clientSecret: config.meta.appSecret || 'dummy',
      redirectUri: `${config.frontend.url}/auth/meta/callback`,
    },
    apiVersion: config.meta.apiVersion,
    maxRetries: 3,
    timeoutMs: 30000,
  });
  metaClient.setAccessToken(token);

  return makeMetaPlatformClient(metaClient, platform);
}

function createGooglePlatformClient(
  platformAccountId: string,
  accessToken: string,
  refreshToken?: string | null,
): PlatformApiClient {
  const googleClient = new GoogleAdsClient({
    auth: {
      clientId: config.google.clientId || 'dummy',
      clientSecret: config.google.clientSecret || 'dummy',
      redirectUri: `${config.frontend.url}/auth/google/callback`,
    },
    api: {
      developerToken: config.google.developerToken || 'dummy',
      baseUrl: config.google.adsApiUrl,
    },
    customerId: platformAccountId,
  });

  // Set tokens directly on the client
  googleClient.setTokens({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
    expiry_date: Date.now() + 3600_000,
    token_type: 'Bearer',
  });

  return {
    async getCampaign(externalId: string): Promise<Campaign | null> {
      try {
        const campaign = await googleClient.getCampaign(platformAccountId, externalId);
        if (!campaign) return null;
        return mapGoogleCampaignToEngineCampaign(campaign, AdPlatform.GOOGLE, externalId);
      } catch (err) {
        logger.warn({ err, externalId, platform: AdPlatform.GOOGLE }, 'Failed to fetch campaign from Google');
        return null;
      }
    },

    async updateBudget(externalId: string, budget: CampaignBudget): Promise<void> {
      const updateData: Record<string, unknown> = {};
      if (budget.dailyBudget !== undefined) {
        updateData.dailyBudgetMicros = Math.round(budget.dailyBudget * 1_000_000);
      }
      await googleClient.updateCampaign(platformAccountId, externalId, updateData as Record<string, unknown>);
    },

    async updateStatus(externalId: string, status: EngineCampaignStatus): Promise<void> {
      const googleStatus = status === 'active' ? 'ENABLED' : 'PAUSED';
      await googleClient.updateCampaign(platformAccountId, externalId, { status: googleStatus } as Record<string, unknown>);
    },

    async updateBid(externalId: string, bid: BidStrategy): Promise<void> {
      if (bid.type && bid.amount) {
        await googleClient.updateCampaign(platformAccountId, externalId, {
          cpcBidMicros: Math.round(bid.amount * 1_000_000),
        } as Record<string, unknown>);
      }
    },

    async updateTargeting(_externalId: string, _targeting: TargetingConfig): Promise<void> {
      throw new Error('Targeting update via campaign-level not supported on Google. Use ad group or campaign-level targeting via dedicated endpoints.');
    },

    async updateCreatives(_externalId: string, _creatives: Creative[]): Promise<void> {
      throw new Error('Creative update via campaign-level not supported on Google. Use ad-level draft.');
    },
  };
}

function makeMetaPlatformClient(metaClient: MetaApiClient, platform: AdPlatform): PlatformApiClient {
  return {
    async getCampaign(externalId: string): Promise<Campaign | null> {
      try {
        const metaCampaign = await metaClient.getCampaign(externalId);
        if (!metaCampaign) return null;
        return mapPlatformCampaignToEngineCampaign(metaCampaign as unknown as Record<string, unknown>, platform, externalId);
      } catch (err) {
        logger.warn({ err, externalId, platform }, 'Failed to fetch campaign from platform');
        return null;
      }
    },

    async updateBudget(externalId: string, budget: CampaignBudget): Promise<void> {
      const updateData: Record<string, unknown> = {};
      if (budget.dailyBudget !== undefined) {
        updateData.daily_budget = Math.round(budget.dailyBudget * 100);
      }
      if (budget.lifetimeBudget !== undefined) {
        updateData.lifetime_budget = Math.round(budget.lifetimeBudget * 100);
      }
      await metaClient.updateCampaign(externalId, updateData as { daily_budget?: number; lifetime_budget?: number });
    },

    async updateStatus(externalId: string, status: EngineCampaignStatus): Promise<void> {
      await metaClient.updateCampaign(externalId, {
        status: mapEngineStatusToMetaStatus(status) as 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED',
      });
    },

    async updateBid(_externalId: string, _bid: BidStrategy): Promise<void> {
      throw new Error('Bid update via campaign-level not supported on Meta. Use adset-level draft.');
    },

    async updateTargeting(_externalId: string, _targeting: TargetingConfig): Promise<void> {
      throw new Error('Targeting update via campaign-level not supported on Meta. Use adset-level draft.');
    },

    async updateCreatives(_externalId: string, _creatives: Creative[]): Promise<void> {
      throw new Error('Creative update via campaign-level not supported on Meta. Use ad-level draft.');
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Engine Factory (creates a configured DraftExecutionEngine per request)
// ───────────────────────────────────────────────────────────────────────────

async function createExecutionEngine(workspaceId: string, draftPlatform: AdPlatform): Promise<DraftExecutionEngine> {
  const platformClients: Record<string, PlatformApiClient> = {};

  // Only initialize the client for the draft's platform
  try {
    const client = await getPlatformClient(draftPlatform, workspaceId);
    platformClients[draftPlatform] = client;
  } catch (err) {
    logger.error({ err, platform: draftPlatform }, 'Failed to initialize platform client');
    throw new PlatformAPIError(draftPlatform, 'Failed to initialize platform API client');
  }

  const options: EngineOptions = {
    draftStore: createSupabaseDraftStore(),
    campaignStore: createSupabaseCampaignStore(),
    snapshotStore: createSupabaseSnapshotStore(),
    logStore: createSupabaseLogStore(),
    platformClients,
    notificationChannels: createInAppNotificationChannel(),
    autoRollback: true,
    maxConcurrentExecutions: 5,
  };

  return new DraftExecutionEngine(options);
}

function createInAppNotificationChannel(): ChannelRegistry {
  return {
    email: {
      async send(_recipients: string[], _subject: string, _body: string): Promise<void> {
        // Email sending implemented via separate notification service
        logger.info('Email notification skipped (not configured)');
      },
    },
    slack: {
      async postMessage(channel: string, message: string, blocks?: unknown[]): Promise<void> {
        logger.info('Slack notification skipped (not configured)');
      },
      async send(_webhookUrl: string, _message: Record<string, unknown>): Promise<void> {
        logger.info('Slack notification skipped (not configured)');
      },
    },
    inApp: {
      async notify(userId: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        logger.info('In-app notification skipped (not configured)');
      },
      async send(userId: string, notification: Record<string, unknown>): Promise<void> {
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          type: notification.type ?? 'draft_update',
          title: (notification.title as string) ?? 'Draft Update',
          message: (notification.message as string) ?? '',
          data: notification.data ?? {},
          read: false,
        });
        if (error) {
          logger.warn({ error }, 'Failed to create in-app notification');
        }
      },
    },
    webhook: {
      async post(url: string, payload: Record<string, unknown>): Promise<void> {
        logger.info('Webhook notification skipped (not configured)');
      },
      async send(_url: string, _payload: Record<string, unknown>): Promise<void> {
        logger.info('Webhook notification skipped (not configured)');
      },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Data Mappers: DB ↔ Engine types
// ───────────────────────────────────────────────────────────────────────────

function mapDbDraftToEngineDraft(db: AppDraft): Draft {
  const platform = (db.platform === 'all' ? AdPlatform.META : db.platform) as AdPlatform;

  // Build a minimal engine Draft from the app-level Draft
  // The campaign, snapshot, and user data are hydrated on demand
  const changeType = mapDraftTypeToChangeType(db.draft_type);

  return {
    id: db.id,
    campaignId: db.campaign_id ?? '',
    platform,
    changeType,
    status: mapDbStatusToEngineStatus(db.status) as DraftStatus,
    proposedChanges: buildProposedChanges(db.draft_type, db.change_detail),
    snapshot: {
      campaignId: db.campaign_id ?? '',
      capturedAt: new Date(db.created_at),
      fullState: buildSnapshotState(db),
      hash: computeHash(buildSnapshotState(db)),
    },
    requestedBy: {
      id: db.actor_id ?? 'unknown',
      email: '',
      name: db.actor_name ?? 'Unknown',
      notificationPreferences: [],
    },
    approvedBy: db.approver_id
      ? { id: db.approver_id, email: '', name: '', notificationPreferences: [] }
      : undefined,
    approvedAt: db.resolved_at ? new Date(db.resolved_at) : undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.resolved_at ?? db.created_at),
    metadata: {
      workspaceId: db.workspace_id,
      changeSummary: db.change_summary,
      aiReasoning: db.ai_reasoning,
      impactEstimate: db.impact_estimate,
      actorType: db.actor_type,
      ruleId: db.rule_id,
    },
    // The execution engine's change-applier dereferences draft.campaign.externalId
    // (and verifyChange does the same), so hydrate it from the snapshot state we
    // already build. Leaving this null caused approval/execution to crash with
    // "Cannot read properties of null (reading 'externalId')".
    campaign: buildSnapshotState(db),
  };
}

function mapDbStatusToEngineStatus(status: string): string {
  const mapping: Record<string, string> = {
    pending: DraftStatus.PENDING,
    approved: DraftStatus.APPLIED,
    rejected: DraftStatus.CANCELLED,
    auto_applied: DraftStatus.APPLIED,
    scheduled: DraftStatus.PENDING,
    error: DraftStatus.FAILED,
    applied: DraftStatus.APPLIED,
    failed: DraftStatus.FAILED,
    cancelled: DraftStatus.CANCELLED,
  };
  return mapping[status] ?? DraftStatus.PENDING;
}

function mapEngineStatusToDbStatus(status: string): string {
  const mapping: Record<string, string> = {
    [DraftStatus.PENDING]: 'pending',
    [DraftStatus.VALIDATING]: 'pending',
    [DraftStatus.READY]: 'pending',
    [DraftStatus.APPLYING]: 'pending',
    [DraftStatus.APPLIED]: 'applied',
    [DraftStatus.FAILED]: 'failed',
    [DraftStatus.ROLLING_BACK]: 'error',
    [DraftStatus.ROLLED_BACK]: 'error',
    [DraftStatus.CANCELLED]: 'cancelled',
  };
  return mapping[status] ?? 'pending';
}

function mapDraftTypeToChangeType(draftType: DraftType): ChangeType {
  const mapping: Record<string, ChangeType> = {
    budget_change: ChangeType.BUDGET,
    status_change: ChangeType.STATUS,
    bid_adjustment: ChangeType.BID,
    targeting_edit: ChangeType.TARGETING,
    creative_upload: ChangeType.CREATIVE,
    campaign_create: ChangeType.STATUS,
    campaign_duplicate: ChangeType.STATUS,
    budget_reallocation: ChangeType.BUDGET,
    rule_based: ChangeType.BUDGET,
    audience_edit: ChangeType.TARGETING,
    schedule_change: ChangeType.STATUS,
    name_change: ChangeType.STATUS,
  };
  return mapping[draftType] ?? ChangeType.BUDGET;
}

function buildProposedChanges(draftType: DraftType, detail: Record<string, unknown>): Record<string, unknown> {
  switch (draftType) {
    case 'budget_change':
      return {
        budget: {
          dailyBudget: typeof detail.new_value === 'number' ? detail.new_value : undefined,
          lifetimeBudget: typeof detail.lifetime_budget === 'number' ? detail.lifetime_budget : undefined,
          budgetType: (detail.budget_type as string) ?? 'daily',
          currency: (detail.currency as string) ?? 'USD',
        },
      };
    case 'status_change':
      return { status: detail.new_status as string };
    case 'bid_adjustment':
      return { bidStrategy: { amount: typeof detail.new_value === 'number' ? detail.new_value : undefined } };
    case 'targeting_edit':
    case 'audience_edit':
      return { targeting: detail };
    default:
      return detail;
  }
}

function buildSnapshotState(db: AppDraft): Campaign {
  // Resolve the platform's external campaign id, preferring (in order):
  //   1. the joined campaign row's platform_campaign_id (the real external id)
  //   2. an explicit platform_campaign_id captured in the draft's change_detail
  // We do NOT fall back to the internal UUID — using it for platform API calls
  // would fail in production since the platform doesn't recognise internal ids.
  const joinedCampaign = (db as AppDraft & {
    campaigns?: { platform_campaign_id?: string; name?: string } | null;
  }).campaigns;
  const externalId =
    joinedCampaign?.platform_campaign_id ??
    (db.change_detail?.platform_campaign_id as string | undefined) ??
    '';

  // Build a best-effort Campaign state from the DB draft record
  return {
    id: db.campaign_id ?? 'unknown',
    externalId,
    platform: (db.platform === 'all' ? AdPlatform.META : db.platform) as AdPlatform,
    name: joinedCampaign?.name ?? db.campaign_name ?? 'Unknown Campaign',
    status: 'active' as EngineCampaignStatus,
    budget: {
      dailyBudget: typeof db.change_detail?.old_value === 'number' ? db.change_detail.old_value as number : 100,
      lifetimeBudget: 0,
      budgetType: 'daily',
      currency: 'USD',
    },
    bidStrategy: { type: 'cpc' },
    targeting: { audiences: [] },
    creatives: [],
    accountId: '',
    organizationId: db.workspace_id,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.created_at),
  };
}

function mapDbCampaignToEngineCampaign(db: Record<string, unknown>): Campaign {
  return {
    id: db.id as string,
    externalId: (db.platform_campaign_id as string) ?? (db.id as string),
    platform: (db.platform as AdPlatform) ?? AdPlatform.META,
    name: (db.name as string) ?? 'Unknown',
    status: mapDbCampaignStatusToEngine(db.status as string),
    budget: {
      dailyBudget: typeof db.daily_budget === 'number' ? db.daily_budget : 0,
      lifetimeBudget: typeof db.lifetime_budget === 'number' ? db.lifetime_budget : 0,
      budgetType: (db.budget_type as 'daily' | 'lifetime') ?? 'daily',
      currency: 'USD',
    },
    bidStrategy: { type: 'cpc' },
    targeting: { audiences: [] },
    creatives: [],
    accountId: (db.ad_account_id as string) ?? '',
    organizationId: '',
    createdAt: new Date(db.created_at as string),
    updatedAt: new Date(db.updated_at as string ?? db.created_at as string),
  };
}


function mapGoogleCampaignToEngineCampaign(
  campaign: unknown,
  _platform: AdPlatform,
  externalId: string,
): Campaign {
  const c = campaign as Record<string, unknown>;
  const status = (c.status === "ENABLED" ? "active" : "paused") as Campaign["status"];
  return {
    id: (c.id as string) ?? externalId,
    externalId,
    platform: _platform,
    name: (c.name as string) ?? "",
    status,
    budget: {
      dailyBudget: 0,
      lifetimeBudget: 0,
      budgetType: "daily" as const,
      currency: "USD",
    },
    bidStrategy: {
      type: "cpc" as const,
    },
    targeting: {
      audiences: [],
    },
    creatives: [],
    accountId: "",
    organizationId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}


function mapPlatformCampaignToEngineCampaign(
  platformCampaign: Record<string, unknown>,
  platform: AdPlatform,
  externalId: string
): Campaign {
  return {
    id: externalId,
    externalId,
    platform,
    name: (platformCampaign.name as string) ?? 'Unknown',
    status: mapMetaStatusToEngine(platformCampaign.status as string),
    budget: {
      dailyBudget: typeof platformCampaign.daily_budget === 'number'
        ? (platformCampaign.daily_budget as number) / 100
        : 0,
      lifetimeBudget: typeof platformCampaign.lifetime_budget === 'number'
        ? (platformCampaign.lifetime_budget as number) / 100
        : 0,
      budgetType: platformCampaign.lifetime_budget ? 'lifetime' : 'daily',
      currency: 'USD',
    },
    bidStrategy: { type: 'cpc' },
    targeting: { audiences: [] },
    creatives: [],
    accountId: (platformCampaign.account_id as string) ?? '',
    organizationId: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapDbCampaignStatusToEngine(status: string): EngineCampaignStatus {
  const map: Record<string, EngineCampaignStatus> = {
    active: 'active' as EngineCampaignStatus,
    paused: 'paused' as EngineCampaignStatus,
    draft: 'draft' as EngineCampaignStatus,
    error: 'deleted' as EngineCampaignStatus,
    ended: 'archived' as EngineCampaignStatus,
  };
  return map[status] ?? ('active' as EngineCampaignStatus);
}

function mapMetaStatusToEngine(status: string): EngineCampaignStatus {
  const map: Record<string, EngineCampaignStatus> = {
    ACTIVE: 'active' as EngineCampaignStatus,
    PAUSED: 'paused' as EngineCampaignStatus,
    DELETED: 'deleted' as EngineCampaignStatus,
    ARCHIVED: 'archived' as EngineCampaignStatus,
    DRAFT: 'draft' as EngineCampaignStatus,
  };
  return map[status] ?? ('active' as EngineCampaignStatus);
}

function mapEngineStatusToMetaStatus(status: EngineCampaignStatus): string {
  const map: Record<string, string> = {
    active: 'ACTIVE',
    paused: 'PAUSED',
    deleted: 'DELETED',
    archived: 'ARCHIVED',
    draft: 'DRAFT',
  };
  return map[status] ?? 'PAUSED';
}

function computeHash(state: Campaign): string {
  const canonical = JSON.stringify(state, Object.keys(state).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ───────────────────────────────────────────────────────────────────────────
// Audit Log Helper
// ───────────────────────────────────────────────────────────────────────────

async function writeAuditLog(params: {
  workspaceId: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  action: string;
  actionCategory: string;
  campaignId?: string;
  details: Record<string, unknown>;
  source: string;
  ipAddress?: string;
}): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    workspace_id: params.workspaceId,
    actor_type: params.actorType,
    actor_id: params.actorId ?? null,
    actor_name: params.actorName ?? null,
    action: params.action,
    action_category: params.actionCategory,
    campaign_id: params.campaignId ?? null,
    details: params.details,
    source: params.source,
    ip_address: params.ipAddress ?? null,
  });
  if (error) {
    logger.warn({ error }, 'Failed to write audit log');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Notification Helpers
// ───────────────────────────────────────────────────────────────────────────

async function notifyCreator(draftId: string, userId: string, title: string, message: string): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'draft_update',
    title,
    message,
    data: { draft_id: draftId },
    read: false,
  });
  if (error) {
    logger.warn({ error, draftId }, 'Failed to create creator notification');
  }
}

async function notifyApprovers(workspaceId: string, draftId: string, title: string, message: string): Promise<void> {
  // Find all workspace admins/owners to notify
  const { data: approvers } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['owner', 'admin']);

  if (!approvers || approvers.length === 0) return;

  const notifications = approvers.map((a: Record<string, unknown>) => ({
    user_id: a.user_id as string,
    type: 'draft_pending_approval' as const,
    title,
    message,
    data: { draft_id: draftId },
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    logger.warn({ error, draftId }, 'Failed to create approver notifications');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Diff View Helper
// ───────────────────────────────────────────────────────────────────────────

function buildDiffView(draft: AppDraft): Record<string, unknown> {
  const detail = draft.change_detail;
  const diff: Record<string, unknown> = {
    draft_type: draft.draft_type,
    summary: draft.change_summary,
  };

  switch (draft.draft_type) {
    case 'budget_change': {
      diff.field = detail.field ?? 'budget';
      diff.old_value = detail.old_value;
      diff.new_value = detail.new_value;
      diff.change_pct =
        typeof detail.old_value === 'number' && typeof detail.new_value === 'number' && detail.old_value > 0
          ? (((detail.new_value as number) - (detail.old_value as number)) / (detail.old_value as number) * 100).toFixed(1) + '%'
          : 'N/A';
      break;
    }
    case 'status_change': {
      diff.field = 'status';
      diff.old_value = detail.old_status;
      diff.new_value = detail.new_status;
      break;
    }
    case 'bid_adjustment': {
      diff.field = 'bid';
      diff.old_value = detail.old_value;
      diff.new_value = detail.new_value;
      break;
    }
    case 'targeting_edit':
    case 'audience_edit': {
      diff.changes = detail.changes ?? detail;
      break;
    }
    default: {
      diff.proposed = detail;
    }
  }

  return diff;
}

// ───────────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
// ───────────────────────────────────────────────────────────────────────────

// ─── GET /api/v1/drafts ────────────────────────────────────────────────────
// List drafts with filtering, search, pagination, and aggregate stats

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // ── Parse query parameters ──
    const statusFilter = req.query.status as string | undefined;
    const typeFilter = req.query.type as string | undefined;
    const platformFilter = req.query.platform as string | undefined;
    const searchQuery = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '50', 10)));

    // ── Build base query ──
    let query = supabase
      .from('drafts')
      .select('*, campaigns!left(name, platform_campaign_id, status)', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    // ── Apply filters ──
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter) {
      query = query.eq('draft_type', typeFilter);
    }
    if (platformFilter) {
      query = query.eq('platform', platformFilter);
    }
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      query = query.or(`change_summary.ilike.%${q}%,campaigns.name.ilike.%${q}%,actor_name.ilike.%${q}%`);
    }

    // ── Execute paginated query ──
    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new AppError('DB_ERROR', `Failed to list drafts: ${error.message}`, 500);
    }

    const drafts = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      campaign_name: (row.campaigns as Record<string, unknown>)?.name ?? row.campaign_name,
    })) as AppDraft[];

    // ── Compute stats (always returned for dashboard header) ──
    const statsQuery = supabase
      .from('drafts')
      .select('status')
      .eq('workspace_id', workspaceId);

    const { data: allStatusRows, error: statsError } = await statsQuery;
    if (statsError) {
      logger.warn({ error: statsError }, 'Failed to compute draft stats');
    }

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      applied: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const row of allStatusRows ?? []) {
      const s = row.status as string;
      if (s === 'pending') stats.pending++;
      else if (s === 'approved' || s === 'auto_applied') stats.approved++;
      else if (s === 'rejected') stats.rejected++;
      else if (s === 'applied') stats.applied++;
      else if (s === 'error' || s === 'failed') stats.failed++;
      else if (s === 'cancelled') stats.cancelled++;
    }

    res.json({
      success: true,
      data: drafts,
      total: count ?? 0,
      stats,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════
// NOTE: /stats route MUST be registered before /:id to avoid Express
// treating "stats" as a draft ID parameter.
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/drafts/stats ──────────────────────────────────────────────
// Draft statistics for dashboard widgets

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // Get status counts
    const { data: statusRows, error: statusError } = await supabase
      .from('drafts')
      .select('status')
      .eq('workspace_id', workspaceId);

    if (statusError) {
      throw new AppError('DB_ERROR', `Failed to fetch draft stats: ${statusError.message}`, 500);
    }

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      applied: 0,
      failed: 0,
      cancelled: 0,
      avgApprovalTime: 0 as number | null,
    };

    const approvalTimes: number[] = [];

    for (const row of statusRows ?? []) {
      stats.total++;
      const s = row.status as string;
      if (s === 'pending') stats.pending++;
      else if (s === 'approved' || s === 'auto_applied') stats.approved++;
      else if (s === 'rejected') stats.rejected++;
      else if (s === 'applied') stats.applied++;
      else if (s === 'error' || s === 'failed') stats.failed++;
      else if (s === 'cancelled') stats.cancelled++;
    }

    // Calculate average approval time for drafts resolved in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: resolvedDrafts } = await supabase
      .from('drafts')
      .select('created_at, resolved_at')
      .eq('workspace_id', workspaceId)
      .in('status', ['approved', 'rejected', 'applied', 'auto_applied'])
      .gte('resolved_at', thirtyDaysAgo);

    for (const d of resolvedDrafts ?? []) {
      if (d.created_at && d.resolved_at) {
        const created = new Date(d.created_at).getTime();
        const resolved = new Date(d.resolved_at).getTime();
        approvalTimes.push(resolved - created);
      }
    }

    if (approvalTimes.length > 0) {
      const avgMs = approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length;
      stats.avgApprovalTime = Math.round(avgMs / 1000 / 60); // minutes
    }

    res.json({ success: true, data: stats });
  }),
);

// ─── GET /api/v1/drafts/:id ────────────────────────────────────────────────
// Single draft with campaign info, user info, and diff view

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const draftId = req.params.id;

    // Fetch draft with campaign info
    const { data: draftRow, error: draftError } = await supabase
      .from('drafts')
      .select('*, campaigns!left(*)')
      .eq('id', draftId)
      .single();

    if (draftError || !draftRow) {
      throw new NotFoundError('Draft');
    }

    const draft = draftRow as Record<string, unknown>;
    const campaignData = draft.campaigns as Record<string, unknown> | null;

    // Fetch creator info
    let creator: Record<string, unknown> | null = null;
    if (draft.actor_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email, name, avatar_url')
        .eq('id', draft.actor_id as string)
        .single();
      creator = user;
    }

    // Fetch approver info
    let approver: Record<string, unknown> | null = null;
    if (draft.approver_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email, name, avatar_url')
        .eq('id', draft.approver_id as string)
        .single();
      approver = user;
    }

    // Fetch execution logs if any
    const { data: logs } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('draft_id', draftId)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Build diff view
    const appDraft: AppDraft = {
      id: draft.id as string,
      workspace_id: draft.workspace_id as string,
      platform: draft.platform as Platform,
      campaign_id: draft.campaign_id as string | undefined,
      campaign_name: (campaignData?.name as string) ?? (draft.campaign_name as string),
      adset_id: draft.adset_id as string | undefined,
      ad_id: draft.ad_id as string | undefined,
      draft_type: draft.draft_type as DraftType,
      change_summary: draft.change_summary as string,
      change_detail: (draft.change_detail as Record<string, unknown>) ?? {},
      ai_reasoning: draft.ai_reasoning as string | undefined,
      impact_estimate: draft.impact_estimate as string | undefined,
      status: draft.status as AppDraft['status'],
      scheduled_at: draft.scheduled_at as string | undefined,
      executed_at: draft.executed_at as string | undefined,
      error_message: draft.error_message as string | undefined,
      actor_type: draft.actor_type as 'ai' | 'user' | 'system',
      actor_id: draft.actor_id as string | undefined,
      actor_name: draft.actor_name as string | undefined,
      rule_id: draft.rule_id as string | undefined,
      approver_id: draft.approver_id as string | undefined,
      approval_note: draft.approval_note as string | undefined,
      created_at: draft.created_at as string,
      resolved_at: draft.resolved_at as string | undefined,
    };

    const diffView = buildDiffView(appDraft);

    res.json({
      success: true,
      data: {
        ...appDraft,
        campaign: campaignData
          ? {
              id: campaignData.id,
              name: campaignData.name,
              platform_campaign_id: campaignData.platform_campaign_id,
              status: campaignData.status,
              daily_budget: campaignData.daily_budget,
              platform: campaignData.platform,
            }
          : null,
        creator,
        approver,
        diff: diffView,
        execution_logs: logs ?? [],
      },
    });
  }),
);

// ─── POST /api/v1/drafts ───────────────────────────────────────────────────
// Create draft (used by AI engine or user)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user?.sub;

    const schema = z.object({
      campaignId: z.string().uuid().optional(),
      adId: z.string().optional(),
      type: z.enum([
        'budget_change',
        'status_change',
        'bid_adjustment',
        'targeting_edit',
        'creative_upload',
        'campaign_create',
        'campaign_duplicate',
        'budget_reallocation',
        'rule_based',
        'audience_edit',
        'schedule_change',
        'name_change',
      ]),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      proposedChanges: z.record(z.unknown()),
      currentState: z.record(z.unknown()).optional(),
      confidenceScore: z.number().min(0).max(1).optional(),
      createdBy: z.enum(['ai', 'user', 'system']).optional(),
      platform: z.enum(['meta', 'google', 'tiktok', 'snap', 'all']).optional(),
      ruleId: z.string().optional(),
    });

    const body = schema.parse(req.body);

    // Resolve platform from campaign if not provided
    let platform = body.platform;
    if (!platform && body.campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*, ad_accounts!inner(platform)')
        .eq('id', body.campaignId)
        .single();
      if (campaign) {
        platform = (campaign.ad_accounts as Record<string, unknown>)?.platform as Platform;
      }
    }
    if (!platform) {
      platform = 'meta';
    }

    // Get campaign name if available
    let campaignName: string | undefined;
    if (body.campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('name')
        .eq('id', body.campaignId)
        .single();
      if (campaign) campaignName = campaign.name as string;
    }

    const actorType = body.createdBy ?? 'user';
    const actorId = actorType === 'ai' ? 'ai_agent' : userId;
    const actorName = actorType === 'ai'
      ? 'AI Agent'
      : req.user?.email ?? 'Unknown';

    const { data: draft, error } = await supabase
      .from('drafts')
      .insert({
        workspace_id: workspaceId,
        platform,
        campaign_id: body.campaignId ?? null,
        campaign_name: campaignName ?? null,
        ad_id: body.adId ?? null,
        draft_type: body.type,
        change_summary: body.title,
        change_detail: {
          ...body.proposedChanges,
          description: body.description,
          current_state: body.currentState ?? null,
        },
        ai_reasoning: body.description,
        impact_estimate: body.confidenceScore
          ? `${(body.confidenceScore * 100).toFixed(0)}% confidence`
          : null,
        status: 'pending',
        actor_type: actorType,
        actor_id: actorId,
        actor_name: actorName,
        rule_id: body.ruleId ?? null,
      })
      .select()
      .single();

    if (error || !draft) {
      throw new AppError('DB_ERROR', `Failed to create draft: ${error?.message}`, 500);
    }

    // ── Audit log ──
    await writeAuditLog({
      workspaceId,
      actorType,
      actorId: actorId ?? undefined,
      actorName,
      action: `Draft created: ${body.title}`,
      actionCategory: 'draft_created',
      campaignId: body.campaignId,
      details: { draft_type: body.type, proposed_changes: body.proposedChanges },
      source: actorType === 'ai' ? 'ai_agent' : 'dashboard',
    });

    // ── Create notifications for approvers ──
    await notifyApprovers(
      workspaceId,
      draft.id as string,
      'New draft pending approval',
      `${body.title} (${body.type})`
    );

    // ── Publish real-time event ──
    try {
      await draftEventPublisher.publishDraftCreated(workspaceId, {
        id: draft.id as string,
        workspaceId,
        title: body.title,
        status: 'pending',
        createdBy: actorType === 'ai' ? 'ai' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to publish draft created event');
    }

    res.status(201).json({
      success: true,
      data: draft as AppDraft,
      message: 'Draft created successfully. Pending approval.',
    });
  }),
);

// ─── POST /api/v1/drafts/:id/approve ───────────────────────────────────────
// APPROVE DRAFT — THIS EXECUTES THE CHANGE (CRITICAL PATH)
//
// Flow: validate → create snapshot → apply via platform client → verify
//       → update status → log → notify → publish event

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const draftId = req.params.id;
    const approverId = req.user!.sub;
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      notes: z.string().optional(),
    });
    const body = schema.parse(req.body);

    // ── Step 1: Load draft ──
    const { data: draftRow, error: draftError } = await supabase
      .from('drafts')
      .select('*, campaigns!left(*)')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (draftError || !draftRow) {
      throw new NotFoundError('Draft');
    }

    const draft = draftRow as Record<string, unknown>;

    // ── Step 2: Validate draft state ──
    // Already-resolved drafts (approved/rejected/cancelled) are a conflict, not
    // a malformed request — return 409 so clients can distinguish the two.
    if (draft.status !== 'pending') {
      throw new ConflictError(`Draft is ${draft.status as string}, not pending. Only pending drafts can be approved.`);
    }

    // Check if draft is expired (7-day expiry)
    const createdAt = new Date(draft.created_at as string);
    const expiryDate = new Date(createdAt.getTime() + 7 * 86400000);
    if (new Date() > expiryDate) {
      // Mark as expired
      await supabase
        .from('drafts')
        .update({ status: 'cancelled', approval_note: 'Draft expired (7 days)' })
        .eq('id', draftId);
      throw new ValidationError('Draft has expired (7 days old). Please create a new draft.');
    }

    // ── Step 3: Build engine Draft and execute ──
    const campaignData = draft.campaigns as Record<string, unknown> | null;
    const platform = (draft.platform === 'all'
      ? AdPlatform.META
      : draft.platform) as AdPlatform;

    const appDraft: AppDraft = {
      id: draft.id as string,
      workspace_id: draft.workspace_id as string,
      platform: draft.platform as Platform,
      campaign_id: draft.campaign_id as string | undefined,
      campaign_name: (campaignData?.name as string) ?? (draft.campaign_name as string),
      draft_type: draft.draft_type as DraftType,
      change_summary: draft.change_summary as string,
      change_detail: (draft.change_detail as Record<string, unknown>) ?? {},
      status: draft.status as AppDraft['status'],
      actor_type: draft.actor_type as 'ai' | 'user' | 'system',
      actor_id: draft.actor_id as string | undefined,
      actor_name: draft.actor_name as string | undefined,
      created_at: draft.created_at as string,
    };

    // ── Step 4: Create and run the DraftExecutionEngine ──
    let executionResult: ExecutionResult;
    try {
      const engine = await createExecutionEngine(workspaceId, platform);
      executionResult = await engine.executeDraft(draftId);
    } catch (err) {
      // Engine initialization or execution failed catastrophically
      logger.error({ err, draftId }, 'DraftExecutionEngine failed');

      // Mark draft as failed
      await supabase
        .from('drafts')
        .update({
          status: 'error',
          approver_id: approverId,
          approval_note: body.notes ?? null,
          error_message: err instanceof Error ? err.message : 'Execution engine failed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', draftId);

      throw new AppError(
        'EXECUTION_FAILED',
        `Draft execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        500
      );
    }

    // ── Step 5: Handle execution result ──
    if (executionResult.status === ExecutionStatus.SUCCESS) {
      // ── Mark as applied ──
      const { data: updatedDraft, error: updateError } = await supabase
        .from('drafts')
        .update({
          status: 'approved',
          approver_id: approverId,
          approval_note: body.notes ?? null,
          executed_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateError || !updatedDraft) {
        throw new AppError('DB_ERROR', `Failed to update draft after execution: ${updateError?.message}`, 500);
      }

      // ── Audit log ──
      await writeAuditLog({
        workspaceId,
        actorType: 'user',
        actorId: approverId,
        action: `Draft approved and applied: ${draft.change_summary as string}`,
        actionCategory: 'draft_approved',
        campaignId: draft.campaign_id as string | undefined,
        details: {
          draft_id: draftId,
          duration_ms: executionResult.durationMs,
          applied_changes: executionResult.appliedChanges?.map((c) => c.field),
        },
        source: 'dashboard',
      });

      // ── Notify creator ──
      if (draft.actor_id && draft.actor_id !== approverId) {
        await notifyCreator(
          draftId,
          draft.actor_id as string,
          'Your draft was approved',
          `"${draft.change_summary as string}" has been applied successfully.`
        );
      }

      // ── Publish real-time event ──
      try {
        await draftEventPublisher.publishDraftApproved(workspaceId, {
          id: draftId,
          workspaceId,
          title: draft.change_summary as string,
          status: 'approved',
          createdBy: draft.actor_type === 'ai' ? 'ai' : 'user',
          createdAt: draft.created_at as string,
          updatedAt: new Date().toISOString(),
        });
        await draftEventPublisher.publishDraftApplied(workspaceId, {
          id: draftId,
          workspaceId,
          title: draft.change_summary as string,
          status: 'applied',
          createdBy: draft.actor_type === 'ai' ? 'ai' : 'user',
          createdAt: draft.created_at as string,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to publish draft approved/applied events');
      }

      res.json({
        success: true,
        data: updatedDraft as AppDraft,
        execution: {
          status: executionResult.status,
          duration_ms: executionResult.durationMs,
          applied_changes: executionResult.appliedChanges,
        },
        message: 'Draft approved and applied successfully',
      });
    } else if (executionResult.status === ExecutionStatus.FAILURE) {
      // ── Execution failed — mark as failed ──
      await supabase
        .from('drafts')
        .update({
          status: 'error',
          approver_id: approverId,
          approval_note: body.notes ?? null,
          error_message: executionResult.error?.message ?? 'Execution failed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', draftId);

      // ── Audit log ──
      await writeAuditLog({
        workspaceId,
        actorType: 'user',
        actorId: approverId,
        action: `Draft approval FAILED: ${draft.change_summary as string}`,
        actionCategory: 'draft_execution_failed',
        campaignId: draft.campaign_id as string | undefined,
        details: {
          draft_id: draftId,
          error: executionResult.error?.message,
          duration_ms: executionResult.durationMs,
        },
        source: 'dashboard',
      });

      // ── Notify creator of failure ──
      if (draft.actor_id) {
        await notifyCreator(
          draftId,
          draft.actor_id as string,
          'Your draft failed to apply',
          `"${draft.change_summary as string}" could not be applied. Error: ${executionResult.error?.message ?? 'Unknown'}`
        );
      }

      throw new AppError(
        'EXECUTION_FAILED',
        `Draft execution failed: ${executionResult.error?.message ?? 'Unknown error'}`,
        500,
        { draft_id: draftId, steps: executionResult.steps }
      );
    } else {
      // ROLLED_BACK or other edge case
      await supabase
        .from('drafts')
        .update({
          status: 'error',
          approver_id: approverId,
          error_message: `Execution ended with status: ${executionResult.status}`,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', draftId);

      throw new AppError(
        'EXECUTION_INCOMPLETE',
        `Draft execution ended with status: ${executionResult.status}. Rollback may have been triggered.`,
        500
      );
    }
  }),
);

// ─── POST /api/v1/drafts/:id/reject ────────────────────────────────────────
// Reject draft

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const draftId = req.params.id;
    const userId = req.user!.sub;
    const workspaceId = req.workspaceId!;

    // Reason is optional — mirrors the v2 RejectDraftUseCase contract.
    const schema = z.object({
      reason: z.string().optional(),
    });
    const body = schema.parse(req.body);

    // Load draft
    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !draft) {
      throw new NotFoundError('Draft');
    }

    if (draft.status !== 'pending') {
      throw new ValidationError(`Draft is ${draft.status}, not pending. Only pending drafts can be rejected.`);
    }

    // Update status
    const { data: updatedDraft, error: updateError } = await supabase
      .from('drafts')
      .update({
        status: 'rejected',
        approver_id: userId,
        approval_note: body.reason,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (updateError || !updatedDraft) {
      throw new AppError('DB_ERROR', `Failed to reject draft: ${updateError?.message}`, 500);
    }

    // ── Audit log ──
    await writeAuditLog({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: `Draft rejected: ${draft.change_summary}`,
      actionCategory: 'draft_rejected',
      campaignId: draft.campaign_id,
      details: { draft_id: draftId, reason: body.reason },
      source: 'dashboard',
    });

    // ── Notify creator ──
    if (draft.actor_id && draft.actor_id !== userId) {
      await notifyCreator(
        draftId,
        draft.actor_id,
        'Your draft was rejected',
        `"${draft.change_summary}" was rejected. Reason: ${body.reason}`
      );
    }

    // ── Publish real-time event ──
    try {
      await draftEventPublisher.publishDraftRejected(workspaceId, {
        id: draftId,
        workspaceId,
        title: draft.change_summary as string,
        status: 'rejected',
        createdBy: draft.actor_type === 'ai' ? 'ai' : 'user',
        createdAt: draft.created_at,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to publish draft rejected event');
    }

    res.json({
      success: true,
      data: updatedDraft as AppDraft,
      message: 'Draft rejected',
    });
  }),
);

// ─── POST /api/v1/drafts/:id/cancel ────────────────────────────────────────
// Cancel draft (by creator or workspace member)

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const draftId = req.params.id;
    const userId = req.user!.sub;
    const workspaceId = req.workspaceId!;

    // Load draft
    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !draft) {
      throw new NotFoundError('Draft');
    }

    // Only pending or scheduled drafts can be cancelled
    if (!['pending', 'scheduled'].includes(draft.status)) {
      throw new ValidationError(`Draft is ${draft.status}. Only pending or scheduled drafts can be cancelled.`);
    }

    // Check permission: creator, approver (admin/owner), or system
    const isCreator = draft.actor_id === userId;
    if (!isCreator) {
      // Check if user is owner/admin
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!member || !['owner', 'admin'].includes(member.role as string)) {
        throw new ForbiddenError('Only the draft creator or workspace admins can cancel this draft');
      }
    }

    // Update status
    const { data: updatedDraft, error: updateError } = await supabase
      .from('drafts')
      .update({
        status: 'cancelled',
        approver_id: userId,
        approval_note: 'Cancelled by user',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (updateError || !updatedDraft) {
      throw new AppError('DB_ERROR', `Failed to cancel draft: ${updateError?.message}`, 500);
    }

    // ── Audit log ──
    await writeAuditLog({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: `Draft cancelled: ${draft.change_summary}`,
      actionCategory: 'draft_cancelled',
      campaignId: draft.campaign_id,
      details: { draft_id: draftId, was_creator: isCreator },
      source: 'dashboard',
    });

    res.json({
      success: true,
      data: updatedDraft as AppDraft,
      message: 'Draft cancelled',
    });
  }),
);

// ─── POST /api/v1/drafts/:id/schedule ──────────────────────────────────────
// Schedule a pending draft for future execution

router.post(
  '/:id/schedule',
  asyncHandler(async (req, res) => {
    const draftId = req.params.id;
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      execute_at: z.string().datetime(),
    });
    const body = schema.parse(req.body);

    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !draft) {
      throw new NotFoundError('Draft');
    }

    if (draft.status !== 'pending') {
      throw new ValidationError(`Draft is ${draft.status}, not pending`);
    }

    const executeAt = new Date(body.execute_at);
    if (executeAt <= new Date()) {
      throw new ValidationError('Schedule time must be in the future');
    }

    const { data: updatedDraft, error: updateError } = await supabase
      .from('drafts')
      .update({
        status: 'scheduled',
        scheduled_at: body.execute_at,
      })
      .eq('id', draftId)
      .select()
      .single();

    if (updateError || !updatedDraft) {
      throw new AppError('DB_ERROR', `Failed to schedule draft: ${updateError?.message}`, 500);
    }

    res.json({
      success: true,
      data: updatedDraft as AppDraft,
      message: `Draft scheduled for ${body.execute_at}`,
    });
  }),
);

export default router;
