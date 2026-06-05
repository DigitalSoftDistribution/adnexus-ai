import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { PlatformError } from '../lib/errors';
import type { Platform, UnifiedCampaign, UnifiedAdSet, UnifiedAd, AdAccount } from '../types';

const SNAP_API_BASE = 'https://adsapi.snapchat.com/v1';

// ─── Snap-Specific Types ─────────────────────────────────────

export interface SnapOrganization {
  id: string;
  name: string;
}

export interface SnapAdAccount {
  id: string;
  name: string;
  status: string;
  organization_id: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface SnapCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'PENDING_REVIEW' | 'REJECTED';
  objective:
    | 'AWARENESS'
    | 'APP_INSTALLS'
    | 'VIDEO_VIEWS'
    | 'TRAFFIC'
    | 'ENGAGEMENT'
    | 'WEBSITE_CONVERSIONS'
    | 'CATALOG_SALES'
    | 'LEAD_GENERATION';
  daily_budget_micro?: number;
  lifetime_budget_micro?: number;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  ad_account_id: string;
  buying_model?: string;
}

export interface SnapAdSquad {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  campaign_id: string;
  bid_micro?: number;
  daily_budget_micro?: number;
  lifetime_budget_micro?: number;
  start_time: string;
  end_time?: string;
  targeting?: Record<string, unknown>;
  placement: string;
  bid_strategy?: string;
  optimization_goal?: string;
  created_at: string;
  updated_at: string;
}

export interface SnapAd {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'PENDING_REVIEW' | 'REJECTED';
  ad_squad_id: string;
  creative_id: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface SnapStats {
  id: string;
  type: string;
  sub_request_status?: string;
  granularity: string;
  start_time: string;
  end_time: string;
  timeseries?: SnapTimeseriesStat[];
  total?: SnapTotalStat;
}

export interface SnapTimeseriesStat {
  start_time: string;
  end_time: string;
  stats: SnapStatMetrics;
}

export interface SnapTotalStat {
  stats: SnapStatMetrics;
}

export interface SnapStatMetrics {
  impressions?: number;
  swipes?: number;
  spend?: number;
  quartile_1?: number;
  quartile_2?: number;
  quartile_3?: number;
  view_completion?: number;
  video_views?: number;
  screen_time_millis?: number;
  conversions?: number;
  conversion_value?: number;
  conversion_rate?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface FetchOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AccountInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  video_views: number;
  view_completion_rate: number;
  reach: number;
  frequency: number;
}

// ─── Helper: Auth Header ─────────────────────────────────────

function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// ─── Helper: Pagination ──────────────────────────────────────

function paginatedParams(opts?: FetchOptions): Record<string, unknown> {
  return {
    limit: opts?.limit ?? 50,
    ...(opts?.offset ? { offset: opts.offset } : {}),
  };
}

// ─── Helper: Extract nested Snap data ────────────────────────

function _extractSnapData<T>(response: { data?: { [key: string]: T[] } }, key: string): T[] {
  if (!response.data || !response.data[key]) return [];
  return response.data[key] ?? [];
}

// ─── OAuth ───────────────────────────────────────────────────

export async function getSnapAuthUrl(workspaceId: string): Promise<string> {
  const redirectUri = `${config.frontend.url}/auth/snap/callback`;
  const url = new URL('https://accounts.snapchat.com/accounts/oauth2/auth');
  url.searchParams.set('client_id', config.snap.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'snapchat-marketing-api');
  url.searchParams.set('state', workspaceId);
  return url.toString();
}

export async function handleSnapCallback(code: string, workspaceId: string): Promise<AdAccount> {
  try {
    const redirectUri = `${config.frontend.url}/auth/snap/callback`;

    // Step 1: Exchange code for access token
    const { data: tokenData } = await axios.post(
      'https://accounts.snapchat.com/accounts/oauth2/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.snap.clientId,
        client_secret: config.snap.clientSecret,
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string) ?? '';
    const expiresIn = (tokenData.expires_in as number) ?? 3600;

    // Step 2: Fetch organizations
    const orgs = await fetchSnapOrganizations(accessToken);
    if (orgs.length === 0) {
      throw new PlatformError('snap', 'No organizations found for this Snap account');
    }

    // Step 3: Fetch ad accounts for the first organization
    const accounts = await fetchSnapAdAccounts(orgs[0].id, accessToken);
    if (accounts.length === 0) {
      throw new PlatformError('snap', 'No ad accounts found for this Snap organization');
    }

    const firstAccount = accounts[0];

    // Step 4: Return as AdAccount
    const adAccount: AdAccount = {
      id: firstAccount.id,
      workspace_id: workspaceId,
      platform: 'snap',
      account_id: firstAccount.id,
      name: `${firstAccount.name} (${firstAccount.id})`,
      status: 'active',
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      metadata: {
        organization_id: orgs[0].id,
        organization_name: orgs[0].name,
        currency: firstAccount.currency,
        timezone: firstAccount.timezone,
        refresh_token: refreshToken,
      },
      created_at: firstAccount.created_at,
    };

    return adAccount;
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('snap', `OAuth callback failed: ${e.message}`);
  }
}

// ─── Token Management ────────────────────────────────────────

export async function refreshSnapToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  try {
    const { data } = await axios.post(
      'https://accounts.snapchat.com/accounts/oauth2/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.snap.clientId,
        client_secret: config.snap.clientSecret,
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { accessToken, expiresAt };
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('snap', `Token refresh failed: ${e.message}`);
  }
}

// ─── Organization + Ad Account ───────────────────────────────

export async function fetchSnapOrganizations(accessToken: string): Promise<SnapOrganization[]> {
  try {
    const { data } = await axios.get(`${SNAP_API_BASE}/organizations`, {
      headers: authHeader(accessToken),
    });

    // Snap API wraps results: data.organizations
    if (data && data.organizations) {
      return (data.organizations as Array<{ organization: SnapOrganization }>).map(
        (o) => o.organization,
      );
    }
    return [];
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('snap', `Failed to fetch organizations: ${e.message}`);
  }
}

export async function fetchSnapAdAccounts(
  organizationId: string,
  accessToken: string,
): Promise<SnapAdAccount[]> {
  try {
    const { data } = await axios.get(`${SNAP_API_BASE}/organizations/${organizationId}/adaccounts`, {
      headers: authHeader(accessToken),
    });

    if (data && data.adaccounts) {
      return (data.adaccounts as Array<{ adaccount: SnapAdAccount }>).map((a) => a.adaccount);
    }
    return [];
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('snap', `Failed to fetch ad accounts: ${e.message}`);
  }
}

// ─── Campaign CRUD ───────────────────────────────────────────

export async function fetchSnapCampaigns(
  adAccountId: string,
  accessToken: string,
  options?: FetchOptions,
): Promise<SnapCampaign[]> {
  try {
    const params: Record<string, unknown> = {
      ...paginatedParams(options),
    };

    // Filter by status if provided
    if (options?.status && options.status !== 'all') {
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        paused: 'PAUSED',
        ended: 'ARCHIVED',
      };
      params.status = statusMap[options.status] ?? options.status.toUpperCase();
    }

    const { data } = await axios.get(`${SNAP_API_BASE}/adaccounts/${adAccountId}/campaigns`, {
      headers: authHeader(accessToken),
      params,
    });

    if (data && data.campaigns) {
      return (data.campaigns as Array<{ campaign: SnapCampaign }>).map((c) => c.campaign);
    }
    return [];
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Failed to fetch campaigns: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function createSnapCampaign(
  accessToken: string,
  adAccountId: string,
  campaign: Partial<SnapCampaign>,
): Promise<string> {
  try {
    const payload: Record<string, unknown> = {
      campaigns: [
        {
          campaign: {
            name: campaign.name ?? 'Untitled Campaign',
            ad_account_id: adAccountId,
            status: 'PAUSED', // Safety: always create paused
            objective: campaign.objective ?? 'AWARENESS',
            start_time: campaign.start_time ?? new Date().toISOString(),
            ...(campaign.daily_budget_micro
              ? { daily_budget_micro: campaign.daily_budget_micro }
              : {}),
            ...(campaign.lifetime_budget_micro
              ? { lifetime_budget_micro: campaign.lifetime_budget_micro }
              : {}),
            ...(campaign.end_time ? { end_time: campaign.end_time } : {}),
            ...(campaign.buying_model ? { buying_model: campaign.buying_model } : {}),
          },
        },
      ],
    };

    const { data } = await axios.post(`${SNAP_API_BASE}/adaccounts/${adAccountId}/campaigns`, payload, {
      headers: authHeader(accessToken),
    });

    // Snap returns the created campaign in the response
    if (data && data.campaigns && data.campaigns.length > 0) {
      return (data.campaigns as Array<{ campaign: { id: string } }>)[0].campaign.id;
    }

    throw new PlatformError('snap', 'Create campaign response missing campaign ID');
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Create campaign failed: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function updateSnapCampaign(
  accessToken: string,
  campaignId: string,
  updates: Partial<SnapCampaign>,
): Promise<void> {
  try {
    const campaignUpdate: Record<string, unknown> = {};

    if (updates.name !== undefined) campaignUpdate.name = updates.name;
    if (updates.status !== undefined) campaignUpdate.status = updates.status;
    if (updates.objective !== undefined) campaignUpdate.objective = updates.objective;
    if (updates.daily_budget_micro !== undefined)
      campaignUpdate.daily_budget_micro = updates.daily_budget_micro;
    if (updates.lifetime_budget_micro !== undefined)
      campaignUpdate.lifetime_budget_micro = updates.lifetime_budget_micro;
    if (updates.start_time !== undefined) campaignUpdate.start_time = updates.start_time;
    if (updates.end_time !== undefined) campaignUpdate.end_time = updates.end_time;
    if (updates.buying_model !== undefined) campaignUpdate.buying_model = updates.buying_model;

    const payload = {
      campaigns: [{ campaign: campaignUpdate }],
    };

    await axios.put(`${SNAP_API_BASE}/campaigns/${campaignId}`, payload, {
      headers: authHeader(accessToken),
    });
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Update campaign failed: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function updateSnapCampaignStatus(
  accessToken: string,
  campaignId: string,
  status: string,
): Promise<void> {
  try {
    const payload = {
      campaigns: [
        {
          campaign: {
            status: status.toUpperCase(),
          },
        },
      ],
    };

    await axios.put(`${SNAP_API_BASE}/campaigns/${campaignId}`, payload, {
      headers: authHeader(accessToken),
    });
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Update campaign status failed: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

// ─── Ad Squad CRUD ───────────────────────────────────────────

export async function fetchSnapAdSquads(
  campaignId: string,
  accessToken: string,
): Promise<SnapAdSquad[]> {
  try {
    const { data } = await axios.get(`${SNAP_API_BASE}/campaigns/${campaignId}/adsquads`, {
      headers: authHeader(accessToken),
      params: { limit: 50 },
    });

    if (data && data.adsquads) {
      return (data.adsquads as Array<{ adsquad: SnapAdSquad }>).map((a) => a.adsquad);
    }
    return [];
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Failed to fetch ad squads: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function createSnapAdSquad(
  accessToken: string,
  campaignId: string,
  adSquad: Partial<SnapAdSquad>,
): Promise<string> {
  try {
    const payload: Record<string, unknown> = {
      adsquads: [
        {
          adsquad: {
            name: adSquad.name ?? 'Untitled Ad Squad',
            campaign_id: campaignId,
            status: 'PAUSED', // Safety: always create paused
            type: 'SNAP_ADS',
            placement: adSquad.placement ?? 'AUTOMATIC',
            optimization_goal: adSquad.optimization_goal ?? 'IMPRESSIONS',
            targeting: adSquad.targeting ?? { demographics: [{ gender: 'MALE', age_groups: ['18-24', '25-34'] }] },
            ...(adSquad.bid_micro ? { bid_micro: adSquad.bid_micro } : {}),
            ...(adSquad.daily_budget_micro ? { daily_budget_micro: adSquad.daily_budget_micro } : {}),
            ...(adSquad.lifetime_budget_micro
              ? { lifetime_budget_micro: adSquad.lifetime_budget_micro }
              : {}),
            ...(adSquad.start_time ? { start_time: adSquad.start_time } : {}),
            ...(adSquad.end_time ? { end_time: adSquad.end_time } : {}),
            ...(adSquad.bid_strategy ? { bid_strategy: adSquad.bid_strategy } : {}),
          },
        },
      ],
    };

    const { data } = await axios.post(
      `${SNAP_API_BASE}/campaigns/${campaignId}/adsquads`,
      payload,
      { headers: authHeader(accessToken) },
    );

    if (data && data.adsquads && data.adsquads.length > 0) {
      return (data.adsquads as Array<{ adsquad: { id: string } }>)[0].adsquad.id;
    }

    throw new PlatformError('snap', 'Create ad squad response missing ID');
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Create ad squad failed: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

// ─── Snap Ad CRUD ────────────────────────────────────────────

export async function fetchSnapAds(adSquadId: string, accessToken: string): Promise<SnapAd[]> {
  try {
    const { data } = await axios.get(`${SNAP_API_BASE}/adsquads/${adSquadId}/ads`, {
      headers: authHeader(accessToken),
      params: { limit: 50 },
    });

    if (data && data.ads) {
      return (data.ads as Array<{ ad: SnapAd }>).map((a) => a.ad);
    }
    return [];
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Failed to fetch ads: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function createSnapAd(
  accessToken: string,
  adSquadId: string,
  ad: Partial<SnapAd>,
): Promise<string> {
  try {
    const payload = {
      ads: [
        {
          ad: {
            name: ad.name ?? 'Untitled Ad',
            ad_squad_id: adSquadId,
            creative_id: ad.creative_id,
            status: 'PAUSED', // Safety: always create paused
            type: ad.type ?? 'SNAP_AD',
          },
        },
      ],
    };

    const { data } = await axios.post(`${SNAP_API_BASE}/adsquads/${adSquadId}/ads`, payload, {
      headers: authHeader(accessToken),
    });

    if (data && data.ads && data.ads.length > 0) {
      return (data.ads as Array<{ ad: { id: string } }>)[0].ad.id;
    }

    throw new PlatformError('snap', 'Create ad response missing ID');
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Create ad failed: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

// ─── Insights ────────────────────────────────────────────────

export async function fetchSnapCampaignStats(
  campaignIds: string[],
  accessToken: string,
  dateRange: DateRange,
  granularity = 'TOTAL',
): Promise<SnapStats[]> {
  try {
    const fields =
      'impressions,swipes,spend,quartile_1,quartile_2,quartile_3,view_completion,video_views,screen_time_millis,conversions,conversion_value,conversion_rate';

    const statsPromises = campaignIds.map(async (campaignId) => {
      try {
        const { data } = await axios.get(
          `${SNAP_API_BASE}/campaigns/${campaignId}/stats`,
          {
            headers: authHeader(accessToken),
            params: {
              granularity,
              start_time: dateRange.startDate,
              end_time: dateRange.endDate,
              fields,
            },
          },
        );

        if (data && data.timeseries_stats && data.timeseries_stats.length > 0) {
          const tsStat = data.timeseries_stats[0] as {
            id: string;
            type: string;
            timeseries: SnapTimeseriesStat[];
            total: SnapTotalStat;
          };
          return {
            id: tsStat.id ?? campaignId,
            type: tsStat.type ?? 'campaign',
            granularity,
            start_time: dateRange.startDate,
            end_time: dateRange.endDate,
            timeseries: tsStat.timeseries ?? [],
            total: tsStat.total ?? { stats: {} },
          };
        }

        return {
          id: campaignId,
          type: 'campaign',
          granularity,
          start_time: dateRange.startDate,
          end_time: dateRange.endDate,
          timeseries: [],
          total: { stats: {} },
        };
      } catch (_innerErr) {
        // Return empty stats for individual campaign failures so we don't fail the whole batch
        return {
          id: campaignId,
          type: 'campaign',
          granularity,
          start_time: dateRange.startDate,
          end_time: dateRange.endDate,
          timeseries: [],
          total: { stats: {} },
        };
      }
    });

    return Promise.all(statsPromises);
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Failed to fetch campaign stats: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

export async function fetchSnapAccountStats(
  adAccountId: string,
  accessToken: string,
  dateRange: DateRange,
): Promise<AccountInsights> {
  try {
    // Step 1: Fetch all campaigns for the account
    const campaigns = await fetchSnapCampaigns(adAccountId, accessToken);
    const campaignIds = campaigns.map((c) => c.id);

    if (campaignIds.length === 0) {
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        cpa: 0,
        roas: 0,
        video_views: 0,
        view_completion_rate: 0,
        reach: 0,
        frequency: 0,
      };
    }

    // Step 2: Fetch stats for all campaigns
    const stats = await fetchSnapCampaignStats(campaignIds, accessToken, dateRange);

    // Step 3: Aggregate stats
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalVideoViews = 0;
    let totalQuartile3 = 0;

    for (const stat of stats) {
      if (stat.total && stat.total.stats) {
        const s = stat.total.stats;
        totalSpend += s.spend ?? 0;
        totalImpressions += s.impressions ?? 0;
        totalClicks += s.swipes ?? 0; // swipes = clicks on Snap
        totalConversions += s.conversions ?? 0;
        totalConversionValue += s.conversion_value ?? 0;
        totalVideoViews += s.video_views ?? 0;
        totalQuartile3 += s.quartile_3 ?? 0;
      }
    }

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const roas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;
    const viewCompletionRate = totalVideoViews > 0 ? (totalQuartile3 / totalVideoViews) * 100 : 0;
    // Snap doesn't provide reach/frequency at account level easily; estimate frequency
    const frequency = totalImpressions > 0 && campaigns.length > 0 ? totalImpressions / (totalImpressions * 0.6) : 0; // rough heuristic
    const reach = totalImpressions > 0 ? Math.round(totalImpressions * 0.6) : 0; // rough estimate

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr,
      conversions: totalConversions,
      cpa,
      roas,
      video_views: totalVideoViews,
      view_completion_rate: viewCompletionRate,
      reach,
      frequency: frequency > 0 ? frequency : 0,
    };
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError(
      'snap',
      `Failed to fetch account stats: ${e.response?.data?.message ?? e.message}`,
    );
  }
}

// ─── Normalization ───────────────────────────────────────────

export async function normalizeSnapCampaign(
  campaign: SnapCampaign,
  stats?: SnapStats,
): Promise<UnifiedCampaign> {
  // Derive metrics from stats if available
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let cpa = 0;
  let roas = 0;
  let ctr = 0;
  let frequency = 0;
  let reach = 0;
  let cpm = 0;
  let cpc = 0;

  if (stats?.total?.stats) {
    const s = stats.total.stats;
    spend = s.spend ?? 0;
    impressions = s.impressions ?? 0;
    clicks = s.swipes ?? 0;
    conversions = s.conversions ?? 0;
    ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    cpa = conversions > 0 ? spend / conversions : 0;
    const conversionValue = s.conversion_value ?? 0;
    roas = spend > 0 ? conversionValue / spend : 0;
    cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    cpc = clicks > 0 ? spend / clicks : 0;
    reach = impressions > 0 ? Math.round(impressions * 0.65) : 0;
    frequency = reach > 0 ? impressions / reach : 0;
  }

  const statusMap: Record<string, 'active' | 'paused' | 'ended'> = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'ended',
    DELETED: 'ended',
    PENDING_REVIEW: 'paused',
    REJECTED: 'ended',
  };

  return {
    id: campaign.id,
    ad_account_id: campaign.ad_account_id,
    platform: 'snap' as Platform,
    platform_campaign_id: campaign.id,
    name: campaign.name,
    status: statusMap[campaign.status] ?? 'paused',
    objective: campaign.objective,
    daily_budget: campaign.daily_budget_micro ? campaign.daily_budget_micro / 1000000 : undefined,
    lifetime_budget: campaign.lifetime_budget_micro
      ? campaign.lifetime_budget_micro / 1000000
      : undefined,
    budget_type: campaign.daily_budget_micro
      ? 'daily'
      : campaign.lifetime_budget_micro
        ? 'lifetime'
        : undefined,
    spend,
    impressions,
    clicks,
    ctr,
    conversions,
    cpa,
    roas,
    frequency,
    reach,
    cpm,
    cpc,
    start_date: campaign.start_time?.slice(0, 10),
    end_date: campaign.end_time?.slice(0, 10),
    platform_data: campaign as unknown as Record<string, unknown>,
    created_at: campaign.created_at ?? campaign.start_time ?? new Date().toISOString(),
  };
}

export async function normalizeSnapAdSquad(adSquad: SnapAdSquad): Promise<UnifiedAdSet> {
  const statusMap: Record<string, 'active' | 'paused' | 'ended'> = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'ended',
    DELETED: 'ended',
  };

  return {
    id: adSquad.id,
    campaign_id: adSquad.campaign_id,
    platform_adset_id: adSquad.id,
    name: adSquad.name,
    status: statusMap[adSquad.status] ?? 'paused',
    daily_budget: adSquad.daily_budget_micro ? adSquad.daily_budget_micro / 1000000 : undefined,
    bid_strategy: adSquad.bid_strategy,
    bid_amount: adSquad.bid_micro ? adSquad.bid_micro / 1000000 : undefined,
    targeting: adSquad.targeting ?? {},
    created_at: adSquad.created_at ?? new Date().toISOString(),
  };
}

export async function normalizeSnapAd(ad: SnapAd): Promise<UnifiedAd> {
  const statusMap: Record<string, 'active' | 'paused' | 'ended'> = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'ended',
    DELETED: 'ended',
    PENDING_REVIEW: 'paused',
    REJECTED: 'ended',
  };

  return {
    id: ad.id,
    adset_id: ad.ad_squad_id,
    platform_ad_id: ad.id,
    name: ad.name,
    status: statusMap[ad.status] ?? 'paused',
    creative_type: ad.type,
    creative_url: undefined,
    creative_text: undefined,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    cpa: 0,
    roas: 0,
    frequency: 0,
    fatigue_score: 0,
    fatigue_status: 'healthy',
    created_at: ad.created_at ?? new Date().toISOString(),
  };
}

// ─── Default Export ──────────────────────────────────────────

const snapApi = {
  // OAuth
  getSnapAuthUrl,
  handleSnapCallback,

  // Organization + Ad Account
  fetchSnapOrganizations,
  fetchSnapAdAccounts,

  // Campaign CRUD
  fetchSnapCampaigns,
  createSnapCampaign,
  updateSnapCampaign,
  updateSnapCampaignStatus,

  // Ad Squad CRUD
  fetchSnapAdSquads,
  createSnapAdSquad,

  // Snap Ad CRUD
  fetchSnapAds,
  createSnapAd,

  // Insights
  fetchSnapCampaignStats,
  fetchSnapAccountStats,

  // Normalization
  normalizeSnapCampaign,
  normalizeSnapAdSquad,
  normalizeSnapAd,

  // Token Management
  refreshSnapToken,
};

export default snapApi;
