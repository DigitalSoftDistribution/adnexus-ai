import type {
  IPlatformSyncService,
  SyncCampaignContext,
  SyncedCampaignMetrics,
  SyncAccountContext,
  SyncAccountResult,
  SyncedCampaign,
} from '../../application/ports/IPlatformSyncService';
import type { Platform } from '../../domain/entities/Campaign';
import {
  fetchGoogleAdGroups,
  fetchGoogleAds,
  fetchGoogleCampaigns,
  fetchGoogleInsights,
  type GoogleCampaign,
  type GoogleInsight,
} from '../../services/google-api';
import { resolveGoogleToken } from './googleToken';
import { getModuleLogger } from '../../lib/logger';

const log = getModuleLogger('google-sync');

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function microsToCurrency(v: unknown): number {
  return num(v) / 1_000_000;
}

function mapGoogleStatus(status: string | undefined): string | undefined {
  switch (status) {
    case 'ENABLED':
      return 'active';
    case 'PAUSED':
      return 'paused';
    case 'REMOVED':
      return 'archived';
    default:
      return undefined;
  }
}

function mapGoogleObjective(channelType: string | undefined): string | null {
  switch (channelType) {
    case 'SEARCH':
    case 'SHOPPING':
    case 'PERFORMANCE_MAX':
    case 'MULTI_CHANNEL':
      return 'sales';
    case 'DISPLAY':
    case 'VIDEO':
    case 'DISCOVERY':
      return 'awareness';
    case 'DEMAND_GEN':
      return 'lead_generation';
    default:
      return null;
  }
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value.slice(0, 10);
}

function metricsFromInsight(insight?: GoogleInsight, status?: string): SyncedCampaignMetrics {
  const spend = microsToCurrency(insight?.metrics_cost_micros);
  const impressions = num(insight?.metrics_impressions);
  const clicks = num(insight?.metrics_clicks);
  const conversions = num(insight?.metrics_conversions);
  const conversionValue = microsToCurrency(insight?.metrics_conversions_value);

  return {
    status: mapGoogleStatus(status ?? insight?.status),
    spend,
    impressions,
    clicks,
    ctr: num(insight?.metrics_ctr) ?? (impressions > 0 ? (clicks / impressions) * 100 : 0),
    conversions,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? conversionValue / spend : 0,
    frequency: 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
  };
}

function campaignResourceName(customerId: string, campaign: GoogleCampaign): string {
  return campaign.resource_name || `customers/${customerId}/campaigns/${campaign.id}`;
}

export class GooglePlatformSyncService implements IPlatformSyncService {
  supports(platform: Platform): boolean {
    return platform === 'google';
  }

  private resolveToken(adAccountId: string): Promise<string | null> {
    return resolveGoogleToken(adAccountId);
  }

  async syncCampaign(ctx: SyncCampaignContext): Promise<SyncedCampaignMetrics | null> {
    if (!this.supports(ctx.platform) || !ctx.platformCampaignId) return null;

    const token = await this.resolveToken(ctx.adAccountId);
    if (!token) return null;

    const until = ctx.dateRange?.until ?? new Date().toISOString().slice(0, 10);
    const since = ctx.dateRange?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      const insights = await fetchGoogleInsights([ctx.platformCampaignId], token, { start: since, end: until });
      return metricsFromInsight(insights[0], insights[0]?.status);
    } catch (e) {
      log.warn({ err: e, campaignId: ctx.platformCampaignId }, 'Google campaign insights fetch failed');
      return null;
    }
  }

  async syncAccount(ctx: SyncAccountContext): Promise<SyncAccountResult | null> {
    if (!this.supports(ctx.platform)) return null;

    const token = await this.resolveToken(ctx.adAccountId);
    if (!token) return null;

    const until = ctx.dateRange?.until ?? new Date().toISOString().slice(0, 10);
    const since = ctx.dateRange?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const errors: SyncAccountResult['errors'] = [];

    let googleCampaigns: GoogleCampaign[];
    try {
      googleCampaigns = await fetchGoogleCampaigns(ctx.platformAccountId, token, { status: 'all' });
    } catch (e) {
      log.warn({ err: e, account: ctx.platformAccountId }, 'Google account campaigns fetch failed');
      errors.push({ scope: 'account', scopeId: ctx.platformAccountId, message: (e as Error).message });
      return { campaigns: [], errors };
    }

        const campaignIds = googleCampaigns.map((campaign) => campaign.id);
    const insightMap = new Map<string, GoogleInsight>();

    if (campaignIds.length > 0) {
      try {
        const insights = await fetchGoogleInsights(campaignIds, token, { start: since, end: until });
        for (const insight of insights) insightMap.set(String(insight.campaign_id), insight);
      } catch (e) {
        errors.push({ scope: 'account', scopeId: ctx.platformAccountId, message: (e as Error).message });
      }
    }

    const campaigns: SyncedCampaign[] = [];
    for (const campaign of googleCampaigns) {
      const resourceName = campaignResourceName(ctx.platformAccountId, campaign);
      const insight = insightMap.get(campaign.id);
      const adSets = await this.fetchAdSets(resourceName, token, errors);

      campaigns.push({
        platformCampaignId: campaign.id,
        name: campaign.name,
        status: mapGoogleStatus(campaign.status) ?? 'paused',
        objective: mapGoogleObjective(campaign.advertising_channel_type),
        dailyBudget: null,
        lifetimeBudget: null,
        budgetType: null,
        startDate: normalizeDate(campaign.start_date),
        endDate: normalizeDate(campaign.end_date),
        metrics: metricsFromInsight(insight, campaign.status),
        adSets,
      });
    }

    return { campaigns, errors };
  }

  private async fetchAdSets(
    campaignResourceNameValue: string,
    token: string,
    errors: SyncAccountResult['errors'],
  ): Promise<NonNullable<SyncedCampaign['adSets']>> {
    let adGroups;
    try {
      adGroups = await fetchGoogleAdGroups(campaignResourceNameValue, token);
    } catch (e) {
      errors.push({ scope: 'adset', scopeId: campaignResourceNameValue, message: (e as Error).message });
      return [];
    }

    const out: NonNullable<SyncedCampaign['adSets']> = [];
    for (const adGroup of adGroups) {
      let ads: NonNullable<SyncedCampaign['adSets']>[number]['ads'] = [];
      try {
        const googleAds = await fetchGoogleAds(adGroup.resource_name, token);
        ads = googleAds.map((ad) => ({
          platformAdId: ad.ad?.id ?? ad.id,
          name: ad.ad?.name ?? ad.name,
          status: mapGoogleStatus(ad.status) ?? 'paused',
          creativeType: ad.ad?.type ?? null,
          creativeUrl: ad.ad?.final_urls?.[0] ?? null,
          creativeText:
            ad.ad?.responsive_search_ad?.headlines?.map((h) => h.text).join(' | ') ??
            ad.ad?.responsive_display_ad?.headlines?.map((h) => h.text).join(' | ') ??
            null,
        }));
      } catch (e) {
        errors.push({ scope: 'ad', scopeId: adGroup.resource_name, message: (e as Error).message });
      }

      out.push({
        platformAdSetId: adGroup.id,
        name: adGroup.name,
        status: mapGoogleStatus(adGroup.status) ?? 'paused',
        dailyBudget: adGroup.cpc_bid_micros ? microsToCurrency(adGroup.cpc_bid_micros) : null,
        bidStrategy: null,
        bidAmount: adGroup.cpc_bid_micros ? microsToCurrency(adGroup.cpc_bid_micros) : null,
        targeting: null,
        ads,
      });
    }
    return out;
  }
}
