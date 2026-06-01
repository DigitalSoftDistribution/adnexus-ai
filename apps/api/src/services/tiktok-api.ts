import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { PlatformError } from '../lib/errors';
import type { AdAccount, Platform, UnifiedCampaign, UnifiedAdSet, UnifiedAd } from '../types';

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

// ─── Types ───────────────────────────────────────────────────

interface DateRange {
  start: string;
  end: string;
}

interface FetchOptions {
  status?: string;
  limit?: number;
  page?: number;
}

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string[];
}

export interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective_type: string;
  budget: number;
  budget_mode: 'BUDGET_MODE_DAY' | 'BUDGET_MODE_TOTAL' | 'BUDGET_MODE_INFINITE';
  spend_cap: number;
  create_time: string;
  modify_time: string;
  advertiser_id: string;
  special_industries?: string[];
  is_new_structure?: boolean;
  is_smart_performance_campaign?: boolean;
  rf_campaign_type?: string;
  campaign_type?: string;
}

export interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  status: string;
  budget: number;
  budget_mode: 'BUDGET_MODE_DAY' | 'BUDGET_MODE_TOTAL';
  bid_price?: number;
  billing_event: string;
  placement_type: string;
  placements?: string[];
  optimize_goal?: string;
  create_time: string;
  modify_time: string;
  advertiser_id: string;
  location_ids?: string[];
  gender?: string;
  age_groups?: string[];
  languages?: string[];
  interest_category_ids?: string[];
  action_categories?: string[];
  deep_bid_type?: string;
  pacing?: string;
  operation_status?: string;
  is_smart_performance_adgroup?: boolean;
}

export interface TikTokAd {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  campaign_id: string;
  status: string;
  create_time: string;
  modify_time: string;
  advertiser_id: string;
  creative?: {
    video_id?: string;
    image_ids?: string[];
    ad_text?: string;
    call_to_action?: string;
    landing_page_url?: string;
    identity_id?: string;
    identity_type?: string;
    display_name?: string;
  };
  identity_type?: string;
  identity_id?: string;
  is_aco?: boolean;
  is_new_structure?: boolean;
  ad_format?: string;
  operation_status?: string;
}

export interface TikTokInsight {
  campaign_id: string;
  dimensions: Record<string, string>;
  metrics: {
    spend: number;
    cpm: number;
    cpc: number;
    ctr: number;
    conversion: number;
    cost_per_conversion: number;
    conversion_rate: number;
    show_cnt: number;
    click_cnt: number;
    video_play_actions: number;
    video_views_p25: number;
    video_views_p50: number;
    video_views_p75: number;
    video_views_p100: number;
  };
}

interface TikTokApiResponse<T> {
  code: number;
  message: string;
  request_id: string;
  data: {
    list?: T[];
    page_info?: {
      page: number;
      page_size: number;
      total_number: number;
      total_page: number;
    };
  } & Record<string, unknown>;
}

interface AccountInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  cpm: number;
  cpc: number;
  roas: number;
  video_views: number;
  platform: Platform;
}

// ─── Helper ──────────────────────────────────────────────────

function ttError(err: unknown, context: string): never {
  const e = err as AxiosError<{ message?: string; code?: number }>;
  const msg = e.response?.data?.message ?? e.message;
  throw new PlatformError('tiktok', `${context}: ${msg}`);
}

async function ttGet<T>(path: string, accessToken: string, params?: Record<string, unknown>): Promise<TikTokApiResponse<T>> {
  const { data } = await axios.get(`${TIKTOK_API}${path}`, {
    headers: { 'Access-Token': accessToken },
    params,
  });
  return data;
}

async function ttPost<T>(path: string, accessToken: string, body?: Record<string, unknown>): Promise<TikTokApiResponse<T>> {
  const { data } = await axios.post(`${TIKTOK_API}${path}`, body, {
    headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
  });
  return data;
}

// ─── OAuth ───────────────────────────────────────────────────

export async function getTikTokAuthUrl(workspaceId: string): Promise<string> {
  const redirectUri = `${config.frontend.url}/auth/tiktok/callback`;
  const scopes = ['ads_management', 'ads_read'];
  const state = Buffer.from(workspaceId).toString('base64');

  const url = new URL(`${TIKTOK_API}/oauth/authorize/`);
  url.searchParams.set('app_id', config.tiktok.appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');

  return url.toString();
}

export async function handleTikTokCallback(code: string, workspaceId: string): Promise<AdAccount> {
  // Exchange code for token
  const redirectUri = `${config.frontend.url}/auth/tiktok/callback`;

  let tokenRes: TikTokTokenResponse;
  try {
    const { data } = await axios.post(`${TIKTOK_API}/oauth/access_token/`, {
      app_id: config.tiktok.appId,
      secret: config.tiktok.appSecret,
      auth_code: code,
      grant_type: 'auth_code',
    });
    if (data.code !== 0) {
      throw new PlatformError('tiktok', `OAuth exchange failed: ${data.message}`);
    }
    tokenRes = data.data;
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError('tiktok', `OAuth exchange failed: ${e.response?.data?.message ?? e.message}`);
  }

  // Fetch advertiser accounts for this user
  let advertisers: Array<{ advertiser_id: string; advertiser_name: string; status: string }> = [];
  try {
    const { data } = await axios.get(`${TIKTOK_API}/oauth2/advertiser/get/`, {
      headers: { 'Access-Token': tokenRes.access_token },
      params: { app_id: config.tiktok.appId, secret: config.tiktok.appSecret },
    });
    if (data.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch advertisers: ${data.message}`);
    }
    advertisers = data.data?.list ?? [];
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError('tiktok', `Failed to fetch advertisers: ${e.response?.data?.message ?? e.message}`);
  }

  if (advertisers.length === 0) {
    throw new PlatformError('tiktok', 'No advertiser accounts found for this TikTok user');
  }

  const primary = advertisers[0];
  const expiresAt = new Date(Date.now() + tokenRes.expires_in * 1000);

  return {
    id: '',
    workspace_id: workspaceId,
    platform: 'tiktok',
    account_id: primary.advertiser_id,
    name: primary.advertiser_name,
    status: 'active',
    token_expires_at: expiresAt.toISOString(),
    metadata: {
      access_token: tokenRes.access_token,
      refresh_token: tokenRes.refresh_token,
      advertiser_ids: advertisers.map((a) => a.advertiser_id),
    },
    created_at: new Date().toISOString(),
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  try {
    const { data } = await axios.post(`${TIKTOK_API}/oauth/refresh_token/`, {
      app_id: config.tiktok.appId,
      secret: config.tiktok.appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (data.code !== 0) {
      throw new PlatformError('tiktok', `Token refresh failed: ${data.message}`);
    }
    const res = data.data;
    const expiresAt = new Date(Date.now() + res.expires_in * 1000);
    return {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt,
    };
  } catch (err) {
    const e = err as AxiosError<{ message?: string }>;
    throw new PlatformError('tiktok', `Token refresh failed: ${e.response?.data?.message ?? e.message}`);
  }
}

// ─── Campaigns ───────────────────────────────────────────────

export async function fetchTikTokCampaigns(
  advertiserId: string,
  accessToken: string,
  options?: FetchOptions,
): Promise<TikTokCampaign[]> {
  try {
    const limit = options?.limit ?? 100;
    const page = options?.page ?? 1;
    const fields = [
      'campaign_id',
      'campaign_name',
      'status',
      'objective_type',
      'budget',
      'budget_mode',
      'spend_cap',
      'create_time',
      'modify_time',
      'advertiser_id',
      'special_industries',
      'is_new_structure',
      'is_smart_performance_campaign',
      'campaign_type',
    ];

    const params: Record<string, unknown> = {
      advertiser_id: advertiserId,
      fields: fields,
      page,
      page_size: limit,
    };

    if (options?.status && options.status !== 'all') {
      params.filtering = JSON.stringify({
        status: options.status === 'active' ? 'CAMPAIGN_STATUS_ENABLE' : 'CAMPAIGN_STATUS_DISABLE',
      });
    }

    const res = await ttGet<TikTokCampaign>('/campaign/get/', accessToken, params);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch campaigns: ${res.message}`);
    }
    return res.data?.list ?? [];
  } catch (err) {
    ttError(err, 'Failed to fetch campaigns');
  }
}

export async function createTikTokCampaign(
  accessToken: string,
  advertiserId: string,
  campaign: Partial<TikTokCampaign>,
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      advertiser_id: advertiserId,
      campaign_name: campaign.campaign_name ?? 'New Campaign',
      objective_type: campaign.objective_type ?? 'TRAFFIC',
      budget_mode: campaign.budget_mode ?? 'BUDGET_MODE_DAY',
      status: 'CAMPAIGN_STATUS_DISABLE', // Safety: always create paused
    };

    if (campaign.budget && campaign.budget > 0) {
      body.budget = campaign.budget; // Not micros — direct currency value
    }

    const res = await ttPost<{ campaign_id: string }>('/campaign/create/', accessToken, body);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Create campaign failed: ${res.message}`);
    }
    return (res.data as { campaign_id: string }).campaign_id;
  } catch (err) {
    ttError(err, 'Create campaign failed');
  }
}

export async function updateTikTokCampaign(
  accessToken: string,
  advertiserId: string,
  campaignId: string,
  updates: Partial<TikTokCampaign>,
): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      advertiser_id: advertiserId,
      campaign_id: campaignId,
    };

    if (updates.campaign_name !== undefined) body.campaign_name = updates.campaign_name;
    if (updates.budget !== undefined) body.budget = updates.budget;
    if (updates.budget_mode !== undefined) body.budget_mode = updates.budget_mode;
    if (updates.spend_cap !== undefined) body.spend_cap = updates.spend_cap;

    const res = await ttPost('/campaign/update/', accessToken, body);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Update campaign failed: ${res.message}`);
    }
  } catch (err) {
    ttError(err, 'Update campaign failed');
  }
}

export async function updateTikTokCampaignStatus(
  accessToken: string,
  advertiserId: string,
  campaignId: string,
  status: string,
): Promise<void> {
  try {
    const tiktokStatus = status === 'active' ? 'CAMPAIGN_STATUS_ENABLE' : 'CAMPAIGN_STATUS_DISABLE';

    const res = await ttPost('/campaign/status/update/', accessToken, {
      advertiser_id: advertiserId,
      campaign_ids: [campaignId],
      operation_status: tiktokStatus,
    });
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Update campaign status failed: ${res.message}`);
    }
  } catch (err) {
    ttError(err, 'Update campaign status failed');
  }
}

// ─── Ad Groups ───────────────────────────────────────────────

export async function fetchTikTokAdGroups(
  campaignId: string,
  accessToken: string,
  advertiserId: string,
): Promise<TikTokAdGroup[]> {
  try {
    const fields = [
      'adgroup_id',
      'adgroup_name',
      'campaign_id',
      'status',
      'budget',
      'budget_mode',
      'bid_price',
      'billing_event',
      'placement_type',
      'placements',
      'optimize_goal',
      'create_time',
      'modify_time',
      'advertiser_id',
      'location_ids',
      'gender',
      'age_groups',
      'languages',
      'interest_category_ids',
      'action_categories',
      'deep_bid_type',
      'pacing',
      'operation_status',
    ];

    const params: Record<string, unknown> = {
      advertiser_id: advertiserId,
      fields: fields,
      page: 1,
      page_size: 100,
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
    };

    const res = await ttGet<TikTokAdGroup>('/adgroup/get/', accessToken, params);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch ad groups: ${res.message}`);
    }
    return res.data?.list ?? [];
  } catch (err) {
    ttError(err, 'Failed to fetch ad groups');
  }
}

export async function createTikTokAdGroup(
  accessToken: string,
  advertiserId: string,
  adGroup: Partial<TikTokAdGroup>,
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      advertiser_id: advertiserId,
      campaign_id: adGroup.campaign_id,
      adgroup_name: adGroup.adgroup_name ?? 'New Ad Group',
      status: 'ADGROUP_STATUS_DISABLE', // Safety: always create paused
    };

    if (adGroup.budget !== undefined) body.budget = adGroup.budget;
    if (adGroup.budget_mode !== undefined) body.budget_mode = adGroup.budget_mode;
    if (adGroup.bid_price !== undefined) body.bid_price = adGroup.bid_price;
    if (adGroup.billing_event !== undefined) body.billing_event = adGroup.billing_event;
    if (adGroup.placement_type !== undefined) body.placement_type = adGroup.placement_type;
    if (adGroup.placements !== undefined) body.placements = adGroup.placements;
    if (adGroup.optimize_goal !== undefined) body.optimize_goal = adGroup.optimize_goal;
    if (adGroup.location_ids !== undefined) body.location_ids = adGroup.location_ids;
    if (adGroup.gender !== undefined) body.gender = adGroup.gender;
    if (adGroup.age_groups !== undefined) body.age_groups = adGroup.age_groups;
    if (adGroup.languages !== undefined) body.languages = adGroup.languages;
    if (adGroup.interest_category_ids !== undefined) body.interest_category_ids = adGroup.interest_category_ids;
    if (adGroup.deep_bid_type !== undefined) body.deep_bid_type = adGroup.deep_bid_type;

    const res = await ttPost<{ adgroup_id: string }>('/adgroup/create/', accessToken, body);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Create ad group failed: ${res.message}`);
    }
    return (res.data as { adgroup_id: string }).adgroup_id;
  } catch (err) {
    ttError(err, 'Create ad group failed');
  }
}

// ─── Ads ─────────────────────────────────────────────────────

export async function fetchTikTokAds(
  adGroupId: string,
  accessToken: string,
  advertiserId: string,
): Promise<TikTokAd[]> {
  try {
    const fields = [
      'ad_id',
      'ad_name',
      'adgroup_id',
      'campaign_id',
      'status',
      'create_time',
      'modify_time',
      'advertiser_id',
      'creative',
      'identity_type',
      'identity_id',
      'is_aco',
      'is_new_structure',
      'ad_format',
      'operation_status',
    ];

    const params: Record<string, unknown> = {
      advertiser_id: advertiserId,
      fields: fields,
      page: 1,
      page_size: 100,
      filtering: JSON.stringify({ adgroup_ids: [adGroupId] }),
    };

    const res = await ttGet<TikTokAd>('/ad/get/', accessToken, params);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch ads: ${res.message}`);
    }
    return res.data?.list ?? [];
  } catch (err) {
    ttError(err, 'Failed to fetch ads');
  }
}

export async function createTikTokAd(
  accessToken: string,
  advertiserId: string,
  ad: Partial<TikTokAd>,
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      advertiser_id: advertiserId,
      adgroup_id: ad.adgroup_id,
      ad_name: ad.ad_name ?? 'New Ad',
      status: 'AD_STATUS_DISABLE', // Safety: always create paused
    };

    if (ad.creative) body.creative = ad.creative;
    if (ad.identity_type !== undefined) body.identity_type = ad.identity_type;
    if (ad.identity_id !== undefined) body.identity_id = ad.identity_id;
    if (ad.ad_format !== undefined) body.ad_format = ad.ad_format;
    if (ad.is_aco !== undefined) body.is_aco = ad.is_aco;

    const res = await ttPost<{ ad_id: string }>('/ad/create/', accessToken, body);
    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Create ad failed: ${res.message}`);
    }
    return (res.data as { ad_id: string }).ad_id;
  } catch (err) {
    ttError(err, 'Create ad failed');
  }
}

// ─── Insights ────────────────────────────────────────────────

export async function fetchTikTokInsights(
  campaignIds: string[],
  accessToken: string,
  advertiserId: string,
  dateRange: DateRange,
): Promise<TikTokInsight[]> {
  try {
    const metrics = [
      'spend',
      'cpm',
      'cpc',
      'ctr',
      'conversion',
      'cost_per_conversion',
      'conversion_rate',
      'show_cnt',
      'click_cnt',
      'video_play_actions',
      'video_views_p25',
      'video_views_p50',
      'video_views_p75',
      'video_views_p100',
    ];

    const res = await ttPost<TikTokInsight>('/report/integrated/get/', accessToken, {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      dimensions: ['campaign_id'],
      metrics,
      data_level: 'AUCTION_CAMPAIGN',
      start_date: dateRange.start,
      end_date: dateRange.end,
      filtering: campaignIds.length > 0 ? JSON.stringify({ campaign_ids: campaignIds }) : undefined,
      page: 1,
      page_size: 100,
    });

    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch insights: ${res.message}`);
    }

    const list = res.data?.list ?? [];
    return list.map((item) => ({
      campaign_id: item.dimensions?.campaign_id ?? '',
      dimensions: item.dimensions ?? {},
      metrics: {
        spend: item.metrics?.spend ?? 0,
        cpm: item.metrics?.cpm ?? 0,
        cpc: item.metrics?.cpc ?? 0,
        ctr: item.metrics?.ctr ?? 0,
        conversion: item.metrics?.conversion ?? 0,
        cost_per_conversion: item.metrics?.cost_per_conversion ?? 0,
        conversion_rate: item.metrics?.conversion_rate ?? 0,
        show_cnt: item.metrics?.show_cnt ?? 0,
        click_cnt: item.metrics?.click_cnt ?? 0,
        video_play_actions: item.metrics?.video_play_actions ?? 0,
        video_views_p25: item.metrics?.video_views_p25 ?? 0,
        video_views_p50: item.metrics?.video_views_p50 ?? 0,
        video_views_p75: item.metrics?.video_views_p75 ?? 0,
        video_views_p100: item.metrics?.video_views_p100 ?? 0,
      },
    }));
  } catch (err) {
    ttError(err, 'Failed to fetch insights');
  }
}

export async function fetchTikTokAccountInsights(
  advertiserId: string,
  accessToken: string,
  dateRange: DateRange,
): Promise<AccountInsights> {
  try {
    const metrics = [
      'spend',
      'cpm',
      'cpc',
      'ctr',
      'conversion',
      'cost_per_conversion',
      'show_cnt',
      'click_cnt',
      'video_play_actions',
    ];

    const res = await ttPost<{
      metrics: {
        spend: number;
        cpm: number;
        cpc: number;
        ctr: number;
        conversion: number;
        cost_per_conversion: number;
        show_cnt: number;
        click_cnt: number;
        video_play_actions: number;
      };
    }>('/report/integrated/get/', accessToken, {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      dimensions: ['advertiser_id'],
      metrics,
      data_level: 'AUCTION_ADVERTISER',
      start_date: dateRange.start,
      end_date: dateRange.end,
      page: 1,
      page_size: 1,
    });

    if (res.code !== 0) {
      throw new PlatformError('tiktok', `Failed to fetch account insights: ${res.message}`);
    }

    const list = res.data?.list ?? [];
    const m = list[0]?.metrics ?? {};

    return {
      spend: m.spend ?? 0,
      impressions: m.show_cnt ?? 0,
      clicks: m.click_cnt ?? 0,
      ctr: m.ctr ?? 0,
      conversions: m.conversion ?? 0,
      cpa: m.cost_per_conversion ?? 0,
      cpm: m.cpm ?? 0,
      cpc: m.cpc ?? 0,
      roas: 0,
      video_views: m.video_play_actions ?? 0,
      platform: 'tiktok',
    };
  } catch (err) {
    ttError(err, 'Failed to fetch account insights');
  }
}

// ─── Normalization ───────────────────────────────────────────

export async function normalizeTikTokCampaign(
  campaign: TikTokCampaign,
  insights?: TikTokInsight,
): Promise<UnifiedCampaign> {
  const statusMap: Record<string, string> = {
    CAMPAIGN_STATUS_ENABLE: 'active',
    CAMPAIGN_STATUS_DISABLE: 'paused',
    CAMPAIGN_STATUS_DELETE: 'ended',
  };

  const spend = insights?.metrics?.spend ?? 0;
  const impressions = insights?.metrics?.show_cnt ?? 0;
  const clicks = insights?.metrics?.click_cnt ?? 0;
  const conversions = insights?.metrics?.conversion ?? 0;
  const ctr = insights?.metrics?.ctr ?? 0;
  const cpa = insights?.metrics?.cost_per_conversion ?? 0;
  const cpm = insights?.metrics?.cpm ?? 0;
  const cpc = insights?.metrics?.cpc ?? 0;

  // Compute ROAS when available
  const roas = 0;

  return {
    id: campaign.campaign_id,
    ad_account_id: campaign.advertiser_id,
    platform: 'tiktok' as Platform,
    platform_campaign_id: campaign.campaign_id,
    name: campaign.campaign_name,
    status: (statusMap[campaign.status] ?? 'paused') as 'active' | 'paused' | 'draft' | 'error' | 'ended',
    objective: campaign.objective_type,
    daily_budget: campaign.budget_mode === 'BUDGET_MODE_DAY' ? campaign.budget : undefined,
    lifetime_budget: campaign.budget_mode === 'BUDGET_MODE_TOTAL' ? campaign.budget : undefined,
    budget_type: campaign.budget_mode === 'BUDGET_MODE_DAY' ? 'daily' : campaign.budget_mode === 'BUDGET_MODE_TOTAL' ? 'lifetime' : undefined,
    spend,
    impressions,
    clicks,
    ctr,
    conversions,
    cpa,
    roas,
    frequency: 0, // TikTok doesn't provide frequency at campaign level in basic report
    reach: 0, // Reach not in basic metrics
    cpm,
    cpc,
    start_date: campaign.create_time?.slice(0, 10),
    end_date: undefined,
    platform_data: campaign as unknown as Record<string, unknown>,
    created_at: campaign.create_time ?? new Date().toISOString(),
  };
}

export async function normalizeTikTokAdGroup(adGroup: TikTokAdGroup): Promise<UnifiedAdSet> {
  const statusMap: Record<string, string> = {
    ADGROUP_STATUS_ENABLE: 'active',
    ADGROUP_STATUS_DISABLE: 'paused',
    ADGROUP_STATUS_DELETE: 'ended',
  };

  return {
    id: adGroup.adgroup_id,
    campaign_id: adGroup.campaign_id,
    platform_adset_id: adGroup.adgroup_id,
    name: adGroup.adgroup_name,
    status: (statusMap[adGroup.status] ?? 'paused') as 'active' | 'paused' | 'draft' | 'error' | 'ended',
    daily_budget: adGroup.budget_mode === 'BUDGET_MODE_DAY' ? adGroup.budget : undefined,
    bid_strategy: adGroup.billing_event,
    bid_amount: adGroup.bid_price,
    targeting: {
      placements: adGroup.placements ?? [],
      placement_type: adGroup.placement_type,
      location_ids: adGroup.location_ids ?? [],
      gender: adGroup.gender,
      age_groups: adGroup.age_groups ?? [],
      languages: adGroup.languages ?? [],
      interest_category_ids: adGroup.interest_category_ids ?? [],
      action_categories: adGroup.action_categories ?? [],
    },
    created_at: adGroup.create_time ?? new Date().toISOString(),
  };
}

export async function normalizeTikTokAd(ad: TikTokAd): Promise<UnifiedAd> {
  const statusMap: Record<string, string> = {
    AD_STATUS_ENABLE: 'active',
    AD_STATUS_DISABLE: 'paused',
    AD_STATUS_DELETE: 'ended',
  };

  return {
    id: ad.ad_id,
    adset_id: ad.adgroup_id,
    platform_ad_id: ad.ad_id,
    name: ad.ad_name,
    status: (statusMap[ad.status] ?? 'paused') as 'active' | 'paused' | 'draft' | 'error' | 'ended',
    creative_type: ad.creative?.call_to_action,
    creative_url: ad.creative?.landing_page_url,
    creative_text: ad.creative?.ad_text,
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
    created_at: ad.create_time ?? new Date().toISOString(),
  };
}

// ─── Default Export ──────────────────────────────────────────

export const tiktokApi = {
  // OAuth
  getTikTokAuthUrl,
  handleTikTokCallback,
  refreshTikTokToken,

  // Campaigns
  fetchTikTokCampaigns,
  createTikTokCampaign,
  updateTikTokCampaign,
  updateTikTokCampaignStatus,

  // Ad Groups
  fetchTikTokAdGroups,
  createTikTokAdGroup,

  // Ads
  fetchTikTokAds,
  createTikTokAd,

  // Insights
  fetchTikTokInsights,
  fetchTikTokAccountInsights,

  // Normalization
  normalizeTikTokCampaign,
  normalizeTikTokAdGroup,
  normalizeTikTokAd,
};

export default tiktokApi;
