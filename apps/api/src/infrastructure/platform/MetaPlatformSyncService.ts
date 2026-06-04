import type {
  IPlatformSyncService,
  SyncCampaignContext,
  SyncedCampaignMetrics,
  SyncAccountContext,
  SyncAccountResult,
  SyncedCampaign,
} from '../../application/ports/IPlatformSyncService';
// SyncedAdSet/SyncedAd are referenced structurally via SyncedCampaign['adSets'].
import type { Platform } from '../../domain/entities/Campaign';
import { query } from '../database/connection';
import {
  getMetaCampaign,
  getMetaCampaigns,
  getMetaInsights,
  getMetaAdSets,
  getMetaAds,
} from '../../services/meta-api';
import { getModuleLogger } from '../../lib/logger';

const log = getModuleLogger('meta-sync');

/** Map a Meta effective/configured status to our internal campaign status. */
function mapMetaStatus(status: string | undefined): string | undefined {
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'PAUSED':
      return 'paused';
    case 'ARCHIVED':
    case 'DELETED':
      return 'archived';
    default:
      return undefined;
  }
}

/** Parse Meta's `purchase_roas` array shape into a single number. */
function parseRoas(insights: Record<string, unknown>): number {
  const raw = insights.purchase_roas;
  if (Array.isArray(raw) && raw.length > 0) {
    const v = Number((raw[0] as { value?: unknown })?.value);
    return Number.isFinite(v) ? v : 0;
  }
  const flat = Number(raw);
  return Number.isFinite(flat) ? flat : 0;
}

/** Sum Meta `conversions`/action-style arrays into a single count. */
function parseConversions(insights: Record<string, unknown>): number {
  const raw = insights.conversions;
  if (Array.isArray(raw)) {
    return raw.reduce((sum, a) => sum + (Number((a as { value?: unknown })?.value) || 0), 0);
  }
  const flat = Number(raw);
  return Number.isFinite(flat) ? flat : 0;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Map a raw Meta insights object into normalized metrics. */
function mapInsights(insights: Record<string, unknown>, status?: string): SyncedCampaignMetrics {
  const impressions = num(insights.impressions);
  const clicks = num(insights.clicks);
  const spend = num(insights.spend);
  const conversions = parseConversions(insights);
  return {
    status: mapMetaStatus(status),
    spend,
    impressions,
    clicks,
    ctr: num(insights.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0),
    conversions,
    cpa: num(insights.cost_per_conversion) || (conversions > 0 ? spend / conversions : 0),
    roas: parseRoas(insights),
    frequency: num(insights.frequency),
    cpm: num(insights.cpm) || (impressions > 0 ? (spend / impressions) * 1000 : 0),
    cpc: num(insights.cpc) || (clicks > 0 ? spend / clicks : 0),
  };
}

/**
 * Pulls live campaign data from the Meta Marketing API for a single campaign.
 *
 * Token resolution reads the owning `ad_accounts` row directly (the OAuth
 * callbacks persist `oauth_token`/`token_expires_at`). This service performs
 * read-only metric sync; write operations (pause/resume) live elsewhere.
 */
export class MetaPlatformSyncService implements IPlatformSyncService {
  supports(platform: Platform): boolean {
    return platform === 'meta';
  }

  private async resolveToken(adAccountId: string): Promise<string | null> {
    const { rows } = await query<{ oauth_token: string | null; token_expires_at: string | null }>(
      `SELECT oauth_token, token_expires_at FROM ad_accounts WHERE id = $1 LIMIT 1`,
      [adAccountId],
    );
    const row = rows[0];
    if (!row?.oauth_token) return null;
    if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now()) {
      log.warn({ adAccountId }, 'Meta token expired; skipping live sync');
      return null;
    }
    return row.oauth_token;
  }

  async syncCampaign(ctx: SyncCampaignContext): Promise<SyncedCampaignMetrics | null> {
    if (!this.supports(ctx.platform) || !ctx.platformCampaignId) {
      return null;
    }

    const token = await this.resolveToken(ctx.adAccountId);
    if (!token) return null;

    const until = ctx.dateRange?.until ?? new Date().toISOString().slice(0, 10);
    const since =
      ctx.dateRange?.since ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Live status (cheap call) + insights for the window. Both are read-only.
    const [campaign, insights] = await Promise.all([
      getMetaCampaign(ctx.platformCampaignId, token).catch((e) => {
        log.warn({ err: e, campaignId: ctx.platformCampaignId }, 'Meta campaign fetch failed');
        return undefined;
      }),
      getMetaInsights(ctx.platformCampaignId, token, since, until).catch((e) => {
        log.warn({ err: e, campaignId: ctx.platformCampaignId }, 'Meta insights fetch failed');
        return {} as Record<string, unknown>;
      }),
    ]);

    return mapInsights(insights, campaign?.status);
  }

  async syncAccount(ctx: SyncAccountContext): Promise<SyncAccountResult | null> {
    if (!this.supports(ctx.platform)) return null;

    const token = await this.resolveToken(ctx.adAccountId);
    if (!token) return null;

    const until = ctx.dateRange?.until ?? new Date().toISOString().slice(0, 10);
    const since =
      ctx.dateRange?.since ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const errors: SyncAccountResult['errors'] = [];

    let metaCampaigns;
    try {
      metaCampaigns = await getMetaCampaigns(ctx.platformAccountId, token, 'all');
    } catch (e) {
      log.warn({ err: e, account: ctx.platformAccountId }, 'Meta account campaigns fetch failed');
      errors.push({ scope: 'account', scopeId: ctx.platformAccountId, message: (e as Error).message });
      return { campaigns: [], errors };
    }

    const campaigns: SyncedCampaign[] = [];

    for (const mc of metaCampaigns) {
      let insights: Record<string, unknown> = {};
      try {
        insights = await getMetaInsights(mc.id, token, since, until);
      } catch (e) {
        // Non-fatal: keep the campaign with zeroed metrics and record the error.
        errors.push({ scope: 'campaign', scopeId: mc.id, message: (e as Error).message });
      }

      const adSets = await this.fetchAdSets(mc.id, token, errors);

      campaigns.push({
        platformCampaignId: mc.id,
        name: mc.name,
        status: mapMetaStatus(mc.status) ?? 'paused',
        objective: mc.objective ?? null,
        dailyBudget: mc.daily_budget ? Number(mc.daily_budget) / 100 : null,
        lifetimeBudget: mc.lifetime_budget ? Number(mc.lifetime_budget) / 100 : null,
        budgetType: mc.daily_budget ? 'daily' : mc.lifetime_budget ? 'lifetime' : null,
        startDate: mc.start_time ? mc.start_time.slice(0, 10) : null,
        endDate: mc.stop_time ? mc.stop_time.slice(0, 10) : null,
        metrics: mapInsights(insights, mc.status),
        adSets,
      });
    }

    return { campaigns, errors };
  }

  /** Fetch ad sets (and their ads) for a campaign; errors are non-fatal. */
  private async fetchAdSets(
    campaignId: string,
    token: string,
    errors: SyncAccountResult['errors'],
  ): Promise<NonNullable<SyncedCampaign['adSets']>> {
    let metaAdSets;
    try {
      metaAdSets = await getMetaAdSets(campaignId, token);
    } catch (e) {
      errors.push({ scope: 'adset', scopeId: campaignId, message: (e as Error).message });
      return [];
    }

    const out: NonNullable<SyncedCampaign['adSets']> = [];
    for (const as of metaAdSets) {
      let ads: NonNullable<SyncedCampaign['adSets']>[number]['ads'] = [];
      try {
        const metaAds = await getMetaAds(as.id, token);
        ads = metaAds.map((ad) => {
          const creative = (ad.creative ?? {}) as Record<string, unknown>;
          return {
            platformAdId: ad.id,
            name: ad.name,
            status: mapMetaStatus(ad.status) ?? 'paused',
            creativeType: (creative.object_type as string) ?? null,
            creativeUrl: (creative.image_url as string) ?? null,
            creativeText: (creative.body as string) ?? (creative.title as string) ?? null,
          };
        });
      } catch (e) {
        errors.push({ scope: 'ad', scopeId: as.id, message: (e as Error).message });
      }

      out.push({
        platformAdSetId: as.id,
        name: as.name,
        status: mapMetaStatus(as.status) ?? 'paused',
        dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
        bidStrategy: as.bid_strategy ?? null,
        bidAmount: as.bid_amount ? Number(as.bid_amount) / 100 : null,
        targeting: as.targeting ?? null,
        ads,
      });
    }
    return out;
  }
}
