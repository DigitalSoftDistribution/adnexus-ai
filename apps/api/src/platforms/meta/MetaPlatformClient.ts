/**
 * MetaPlatformClient — PlatformClient adapter for Meta Marketing API.
 *
 * Wraps MetaApiClient (the standalone Meta SDK) and implements the
 * PlatformClient interface so the PlatformManager can route Meta-bound
 * campaigns, ads, insights, and auth operations through the real API.
 *
 * This adapter handles:
 * - Meta-specific types → Unified type mapping (MetaCampaign → UnifiedCampaign, etc.)
 * - Account-level scoping (MetaApiClient operates per-account)
 * - OAuth token lifecycle (exchange, refresh, validate)
 * - Error normalization (MetaApiError → PlatformAPIError)
 */

import { MetaApiClient, MetaMarketingError } from './client';
import type { MetaCampaign, MetaAd, MetaAdCreative, MetaAdStatus, MetaInsight, CreateCampaignData, UpdateCampaignData, CreateAdData, MetaClientConfig } from './types';
import { PlatformAPIError, wrapError } from '../errors';
import type {
  Platform,
  PlatformClient,
  AdAccount,
  CampaignFilters,
  UnifiedCampaign,
  UnifiedAd,
  UnifiedInsight,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdInput,
  DateRange,
  AccountSummary,
  TokenRefreshResult,
  RateLimitStatus,
} from '../types';

// ──────────────────────────────────────────────
// Helpers: Meta → Unified type mapping
// ──────────────────────────────────────────────

function mapCampaign(c: MetaCampaign, platformAccountId: string, currency: string): UnifiedCampaign {
  return {
    id: `meta:${c.id}`,
    platform: 'meta',
    platformCampaignId: c.id,
    name: c.name ?? 'Untitled Campaign',
    status: mapMetaStatus(c.status ?? 'PAUSED'),
    objective: mapMetaObjective(c.objective ?? 'NONE'),
    budgetType: c.daily_budget ? 'daily' : 'lifetime',
    budget: parseFloat(c.daily_budget ?? c.lifetime_budget ?? '0') / 100,
    budgetCurrency: currency,
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    cpa: 0,
    roas: 0,
    startDate: c.created_time ?? new Date().toISOString(),
    endDate: c.updated_time ?? undefined,
    targeting: { platformSpecific: c as unknown as Record<string, unknown> },
    createdAt: c.created_time ?? new Date().toISOString(),
    updatedAt: c.updated_time ?? new Date().toISOString(),
    platformRaw: c as unknown as Record<string, unknown>,
  };
}

function mapMetaStatus(apiStatus: string): UnifiedCampaign['status'] {
  switch (apiStatus) {
    case 'ACTIVE': return 'active';
    case 'PAUSED': return 'paused';
    case 'DELETED': case 'ARCHIVED': return 'archived';
    default: return 'draft';
  }
}

function mapMetaObjective(obj: string): UnifiedCampaign['objective'] {
  const o = obj.toUpperCase();
  if (o.includes('CONVERSION')) return 'conversions';
  if (o.includes('LINK_CLICK') || o.includes('TRAFFIC')) return 'traffic';
  if (o.includes('ENGAGEMENT') || o.includes('POST_ENGAGEMENT')) return 'engagement';
  if (o.includes('APP_INSTALL')) return 'app_installs';
  if (o.includes('VIDEO_VIEW')) return 'video_views';
  if (o.includes('LEAD')) return 'lead_generation';
  if (o.includes('AWARENESS') || o.includes('REACH')) return 'awareness';
  if (o.includes('SALES') || o.includes('CATALOG')) return 'sales';
  return 'conversions';
}

function mapMetaCreativeType(creative: MetaAdCreative | undefined): UnifiedAd['creativeType'] {
  const objectType = creative?.object_type ?? 'PHOTO';
  switch (objectType) {
    case 'VIDEO': return 'video';
    case 'CAROUSEL': return 'carousel';
    case 'COLLECTION': return 'collection';
    case 'STORY': return 'story';
    case 'REEL': return 'reel';
    default: return 'image';
  }
}

function mapAd(
  ad: MetaAd,
  campaignId: string,
  accountId: string,
  thumbnailUrl: string,
): UnifiedAd {
  const creative = (ad.creative as MetaAdCreative | undefined) ?? {};
  return {
    id: `meta:${ad.id}`,
    campaignId,
    adGroupId: ad.adset_id,
    platform: 'meta',
    platformAdId: ad.id,
    name: ad.name ?? 'Untitled Ad',
    status: mapMetaStatus(ad.status ?? 'PAUSED'),
    creativeType: mapMetaCreativeType(creative as MetaAdCreative | undefined),
    headline: (creative as Record<string, string>).title ?? ad.name ?? 'Ad',
    body: (creative as Record<string, string>).body ?? '',
    callToAction: 'LEARN_MORE',
    landingPageUrl: '',
    creativeUrl: (creative as Record<string, string>).image_url,
    thumbnailUrl,
    performance: { impressions: 0, clicks: 0, spend: 0, ctr: 0 },
    createdAt: ad.created_time ?? new Date().toISOString(),
    updatedAt: ad.updated_time ?? new Date().toISOString(),
    platformRaw: ad as unknown as Record<string, unknown>,
  };
}

function mapInsight(i: MetaInsight): UnifiedInsight {
  return {
    campaignId: i.campaign_id ?? '',
    adGroupId: i.adset_id,
    adId: i.ad_id,
    platform: 'meta',
    date: i.date_start ?? new Date().toISOString().slice(0, 10),
    impressions: parseInt(i.impressions ?? '0', 10),
    clicks: parseInt(i.clicks ?? '0', 10),
    spend: parseFloat(i.spend ?? '0'),
    conversions: parseInt(i.actions ?? '0', 10),
    conversionValue: parseFloat(i.action_values ?? '0'),
    ctr: parseFloat(i.ctr ?? '0'),
    cpc: parseFloat(i.cpc ?? '0'),
    cpm: parseFloat(i.cpm ?? '0'),
    cpa: parseFloat(i.cpa ?? '0'),
    roas: parseFloat(i.roas ?? '0'),
    reach: i.reach ? parseInt(i.reach, 10) : undefined,
    frequency: i.frequency ? parseFloat(i.frequency) : undefined,
    platformRaw: i as unknown as Record<string, unknown>,
  };
}

function parseMetaObjectiveForCreate(input: UnifiedCampaign['objective']): string {
  switch (input) {
    case 'awareness': return 'REACH';
    case 'traffic': return 'LINK_CLICKS';
    case 'engagement': return 'POST_ENGAGEMENT';
    case 'app_installs': return 'APP_INSTALLS';
    case 'video_views': return 'VIDEO_VIEWS';
    case 'lead_generation': return 'LEAD_GENERATION';
    case 'conversions': return 'CONVERSIONS';
    case 'sales': return 'CONVERSIONS';
    case 'retargeting': return 'CONVERSIONS';
    default: return 'CONVERSIONS';
  }
}

// ──────────────────────────────────────────────
// MetaPlatformClient
// ──────────────────────────────────────────────

export class MetaPlatformClient implements PlatformClient {
  readonly platform: Platform = 'meta';
  readonly account: AdAccount;

  private client: MetaApiClient | null = null;

  constructor(
    account: AdAccount,
    private readonly clientConfig?: Partial<MetaClientConfig>,
  ) {
    this.account = account;
  }

  private getClient(): MetaApiClient {
    if (!this.client) {
      this.client = new MetaApiClient({
        oauth: {
          clientId: process.env.META_APP_ID ?? '',
          clientSecret: process.env.META_APP_SECRET ?? '',
          redirectUri: process.env.META_REDIRECT_URI ?? 'https://api.adnexus.ai/auth/meta/callback',
        },
        ...this.clientConfig,
      });

      // If we already have an access token, set it
      if (this.account.accessToken) {
        this.client.setAccessToken(this.account.accessToken);
      }
      if (this.account.refreshToken) {
        this.client.setRefreshToken(this.account.refreshToken);
      }
    }
    return this.client;
  }

  private handleMetaError(error: unknown, context: string): never {
    if (error instanceof MetaMarketingError) {
      throw new PlatformAPIError(
        'meta',
        mapMetaErrorCode(error.errorType),
        `Meta ${context}: ${error.message}`,
        error.retryable,
      );
    }
    throw wrapError('meta', error, context);
  }

  // ── Campaign operations ──────────────────────────

  async getCampaigns(filters?: CampaignFilters): Promise<UnifiedCampaign[]> {
    try {
      const accountId = this.account.platformAccountId;
      const client = this.getClient();
      const result = await client.getCampaigns(accountId, {
        limit: filters?.limit ?? 25,
      });

      return (result.data ?? []).map((c: MetaCampaign) =>
        mapCampaign(c, accountId, this.account.currency),
      );
    } catch (error) {
      return [];
    }
  }

  async getCampaign(campaignId: string): Promise<UnifiedCampaign> {
    try {
      const client = this.getClient();
      const campaigns = await client.getCampaigns(this.account.platformAccountId, {});
      const found = (campaigns.data ?? []).find((c) => c.id === campaignId);
      if (!found) {
        throw new PlatformAPIError('meta', 'NOT_FOUND_CAMPAIGN', `Campaign ${campaignId} not found`, false);
      }
      return mapCampaign(found, this.account.platformAccountId, this.account.currency);
    } catch (error) {
      this.handleMetaError(error, `getCampaign(${campaignId})`);
      throw error;
    }
  }

  async createCampaign(data: CreateCampaignInput): Promise<UnifiedCampaign> {
    try {
      const client = this.getClient();
      const metaData: CreateCampaignData = {
        name: data.name,
        objective: parseMetaObjectiveForCreate(data.objective) as CreateCampaignData['objective'],
        status: data.status === 'paused' ? 'PAUSED' : 'ACTIVE',
        special_ad_categories: [],
      };

      if (data.budgetType === 'daily') {
        metaData.daily_budget = Math.round(data.budget * 100).toString();
      } else {
        metaData.lifetime_budget = Math.round(data.budget * 100).toString();
      }

      const result = await client.createCampaign(this.account.platformAccountId, metaData);
      return await this.getCampaign(result.id);
    } catch (error) {
      this.handleMetaError(error, 'createCampaign');
      throw error;
    }
  }

  async updateCampaign(campaignId: string, data: UpdateCampaignInput): Promise<UnifiedCampaign> {
    try {
      const client = this.getClient();
      const metaData: UpdateCampaignData = {};
      if (data.name !== undefined) metaData.name = data.name;
      if (data.status !== undefined) {
        metaData.status = data.status === 'paused' ? 'PAUSED' : 'ACTIVE';
      }
      if (data.budgetType === 'daily' && data.budget !== undefined) {
        metaData.daily_budget = Math.round(data.budget * 100).toString();
      } else if (data.budget !== undefined) {
        metaData.lifetime_budget = Math.round(data.budget * 100).toString();
      }

      await client.updateCampaign(campaignId, metaData);
      return await this.getCampaign(campaignId);
    } catch (error) {
      this.handleMetaError(error, `updateCampaign(${campaignId})`);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<UnifiedCampaign> {
    return this.updateCampaign(campaignId, { status: 'paused' });
  }

  async resumeCampaign(campaignId: string): Promise<UnifiedCampaign> {
    return this.updateCampaign(campaignId, { status: 'active' });
  }

  // ── Ad operations ────────────────────────────────

  async getAds(campaignId: string): Promise<UnifiedAd[]> {
    try {
      const client = this.getClient();
      const result = await client.getAds(this.account.platformAccountId, {});
      const ads = (result.data ?? []).filter((a: MetaAd) => a.campaign_id === campaignId);

      return ads.map((ad: MetaAd) =>
        mapAd(ad, campaignId, this.account.platformAccountId, ''),
      );
    } catch {
      return [];
    }
  }

  async createAd(data: CreateAdInput): Promise<UnifiedAd> {
    try {
      const client = this.getClient();
      const metaData: CreateAdData = {
        name: data.name,
        adset_id: data.adGroupId ?? '',
        creative: {
          name: data.headline,
          title: data.headline,
          body: data.body,
          image_url: data.creativeUrl ?? '',
        },
        status: (data.status === 'paused' ? 'PAUSED' : 'ACTIVE') as MetaAdStatus,
      };

      const result = await client.createAd(this.account.platformAccountId, metaData);
      return mapAd(result as unknown as MetaAd, data.campaignId, this.account.platformAccountId, data.creativeUrl);
    } catch (error) {
      this.handleMetaError(error, 'createAd');
      throw error;
    }
  }

  async updateAd(adId: string, data: Partial<CreateAdInput>): Promise<UnifiedAd> {
    try {
      const client = this.getClient();
      const metaData: Record<string, unknown> = {};
      if (data.name !== undefined) metaData.name = data.name;
      if (data.status !== undefined) metaData.status = data.status === 'paused' ? 'PAUSED' : 'ACTIVE';

      await client.updateAd(adId, metaData as unknown as { name?: string; status?: MetaAdStatus });
      const ads = await client.getAds(this.account.platformAccountId, {});
      const found = (ads.data ?? []).find((a: MetaAd) => a.id === adId);
      if (!found) {
        throw new PlatformAPIError('meta', 'NOT_FOUND_AD', `Ad ${adId} not found`, false);
      }
      return mapAd(found, found.campaign_id ?? '', this.account.platformAccountId, '');
    } catch (error) {
      this.handleMetaError(error, `updateAd(${adId})`);
      throw error;
    }
  }

  // ── Insights / reporting ─────────────────────────

  async getInsights(campaignId: string, dateRange: DateRange): Promise<UnifiedInsight[]> {
    try {
      const client = this.getClient();
      const result = await client.getCampaignInsights(campaignId, {
        time_range: { since: dateRange.start, until: dateRange.end },
      });

      return (result.data ?? []).map(mapInsight);
    } catch {
      return [];
    }
  }

  async getAccountSummary(dateRange: DateRange): Promise<AccountSummary> {
    try {
      const client = this.getClient();
      const result = await client.getAccountInsights(this.account.platformAccountId, {
        time_range: { since: dateRange.start, until: dateRange.end },
      });

      const insights = (result.data ?? []).map(mapInsight);
      const totals = {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      };

      for (const i of insights) {
        totals.spend += i.spend;
        totals.impressions += i.impressions;
        totals.clicks += i.clicks;
        totals.conversions += i.conversions;
        totals.conversionValue += i.conversionValue;
      }

      totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
      totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
      totals.cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
      totals.roas = totals.spend > 0 ? totals.conversionValue / totals.spend : 0;

      const byDay = new Map<string, typeof totals>();
      for (const i of insights) {
        const existing = byDay.get(i.date) ?? { ...totals, spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0 };
        existing.spend += i.spend;
        existing.impressions += i.impressions;
        existing.clicks += i.clicks;
        existing.conversions += i.conversions;
        existing.conversionValue += i.conversionValue;
        byDay.set(i.date, existing);
      }

      return {
        workspaceId: this.account.workspaceId,
        dateRange,
        totals,
        byPlatform: [{
          platform: 'meta',
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          conversionValue: totals.conversionValue,
          roas: totals.roas,
          budget: 0,
        }],
        byCampaign: [],
        byDay: Array.from(byDay.entries()).map(([date, d]) => ({
          date,
          spend: d.spend,
          impressions: d.impressions,
          clicks: d.clicks,
          conversions: d.conversions,
          roas: d.roas,
        })),
      };
    } catch {
      return {
        workspaceId: this.account.workspaceId,
        dateRange,
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0 },
        byPlatform: [],
        byCampaign: [],
        byDay: [],
      };
    }
  }

  // ── Authentication ───────────────────────────────

  async refreshToken(): Promise<TokenRefreshResult> {
    try {
      const client = this.getClient();
      const result = await client.refreshAccessToken();
      return {
        accountId: this.account.id,
        platform: 'meta',
        accessToken: result.accessToken,
        expiresAt: new Date(result.expiresAt).toISOString(),
        refreshed: true,
      };
    } catch (error) {
      this.handleMetaError(error, 'refreshToken');
      throw error;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!this.account.accessToken) return false;
      const info = await client.validateToken();
      return info.app_id.length > 0;
    } catch {
      return false;
    }
  }

  // ── Utility ──────────────────────────────────────

  async testConnection(): Promise<boolean> {
    return this.validateToken();
  }

  async getRateLimitStatus(): Promise<RateLimitStatus> {
    try {
      // MetaApiClient tracks rate limit internally — approximate
      return {
        platform: 'meta',
        remaining: 200,
        limit: 200,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
      };
    } catch {
      return { platform: 'meta', remaining: 0, limit: 200, resetAt: new Date().toISOString() };
    }
  }
}

// ──────────────────────────────────────────────
// Error code mapping: MetaErrorType → PlatformErrorCode
// ──────────────────────────────────────────────

function mapMetaErrorCode(metaType: string): string {
  switch (metaType) {
    case 'SESSION_EXPIRED':
    case 'AUTHENTICATION_ERROR':
      return 'AUTH_TOKEN_EXPIRED';
    case 'RATE_LIMIT':
      return 'RATE_LIMIT_HOUR';
    case 'INVALID_PARAMETER':
      return 'VALIDATION_INVALID_FORMAT';
    case 'RESOURCE_NOT_FOUND':
      return 'NOT_FOUND_CAMPAIGN';
    case 'INSUFFICIENT_PERMISSIONS':
      return 'AUTH_INSUFFICIENT_SCOPE';
    case 'POLICY_VIOLATION':
      return 'VALIDATION_POLICY_VIOLATION';
    case 'BILLING_ERROR':
      return 'UNKNOWN_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

// ──────────────────────────────────────────────
// Factory — exchange OAuth code and return a ready client
// ──────────────────────────────────────────────

/**
 * Exchange an OAuth authorization code for a Meta ad account,
 * returning a fully-authenticated MetaPlatformClient ready for
 * the PlatformManager to use.
 */
export async function connectMetaAccount(
  code: string,
  workspaceId: string,
  redirectUri?: string,
): Promise<{ account: AdAccount; client: MetaPlatformClient }> {
  const tempClient = new MetaApiClient({
    oauth: {
      clientId: process.env.META_APP_ID!,
      clientSecret: process.env.META_APP_SECRET!,
      redirectUri: redirectUri ?? (process.env.META_REDIRECT_URI || 'https://api.adnexus.ai/auth/meta/callback'),
    },
  });

  // Exchange code for token
  const authState = await tempClient.exchangeCodeForToken(code);

  // Try to resolve ad account info via the Graph API /me endpoint
  let platformAccountId = authState.adAccountId || 'pending';
  let accountName = 'Meta Account';
  let currency = 'USD';
  let timezone = 'America/New_York';

  try {
    // Use the raw axios to query /me/adaccounts to discover the first active account
    const accountsResult = await (tempClient as unknown as Record<string, unknown>).request?.(
      'GET', '/me/adaccounts', undefined,
      { params: { fields: 'id,name,account_id,account_status,currency,timezone_name', limit: 1 } }
    ) as { data?: Array<Record<string, unknown>> };

    const accountsData = (accountsResult as { data?: Array<Record<string, unknown>> })?.data;
    if (accountsData && accountsData.length > 0) {
      const first = accountsData[0];
      platformAccountId = (first.account_id as string) ?? (first.id as string) ?? platformAccountId;
      accountName = (first.name as string) ?? accountName;
      currency = (first.currency as string) ?? currency;
      timezone = (first.timezone_name as string) ?? timezone;
    }
  } catch {
    // If /me/adaccounts fails, fall back to the user ID from auth state
  }

  const account: AdAccount = {
    id: `meta_${Date.now()}`,
    workspaceId,
    platform: 'meta',
    platformAccountId,
    name: accountName,
    currency,
    timezone,
    status: 'active',
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
    tokenExpiresAt: authState.expiresAt ? new Date(authState.expiresAt * 1000).toISOString() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const platformClient = new MetaPlatformClient(account);

  return { account, client: platformClient };
}
