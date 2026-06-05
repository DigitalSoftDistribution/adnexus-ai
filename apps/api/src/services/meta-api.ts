import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { PlatformError } from '../lib/errors';
import type { Platform, UnifiedCampaign } from '../types';

const META_API = `${config.meta.graphUrl}/${config.meta.apiVersion}`;

// ─── Types ───────────────────────────────────────────────────

interface MetaTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  business_name?: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time: string;
  stop_time?: string;
  account_id: string;
}

// ─── OAuth ───────────────────────────────────────────────────

export function getMetaOAuthUrl(redirectUri: string, state: string): string {
  const scopes = ['ads_read', 'ads_management', 'business_management'];
  const url = new URL(`${config.meta.graphUrl}/${config.meta.apiVersion}/dialog/oauth`);
  url.searchParams.set('client_id', config.meta.appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

export async function exchangeMetaCode(code: string, redirectUri: string): Promise<MetaTokenResponse> {
  try {
    const { data } = await axios.get(`${META_API}/oauth/access_token`, {
      params: {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });
    return data;
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `OAuth exchange failed: ${e.message}`);
  }
}

export async function refreshMetaToken(refreshToken: string): Promise<MetaTokenResponse> {
  try {
    const { data } = await axios.get(`${META_API}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: refreshToken,
      },
    });
    return data;
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Token refresh failed: ${e.message}`);
  }
}

// ─── Ad Accounts ─────────────────────────────────────────────

export async function getMetaAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  try {
    const { data } = await axios.get(`${META_API}/me/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_status,business_name',
        limit: 100,
      },
    });
    return data.data ?? [];
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Failed to fetch accounts: ${e.message}`);
  }
}

// ─── Campaigns ───────────────────────────────────────────────

/**
 * Follow Meta cursor pagination (`paging.next`) and collect all pages.
 * Capped at `maxPages` so a pathological account can't loop forever.
 */
async function fetchAllPages<T>(url: string, params: Record<string, unknown>, maxPages = 25): Promise<T[]> {
  const out: T[] = [];
  let nextUrl: string | undefined;
  let nextParams: Record<string, unknown> | undefined = params;

  for (let page = 0; page < maxPages; page++) {
    const { data } = nextUrl
      ? await axios.get(nextUrl)
      : await axios.get(url, { params: nextParams });
    if (Array.isArray(data.data)) out.push(...data.data);
    const next = data.paging?.next as string | undefined;
    if (!next) break;
    nextUrl = next; // `next` is a fully-qualified URL with cursor + token baked in.
    nextParams = undefined;
  }
  return out;
}

export async function getMetaCampaigns(
  accountId: string,
  accessToken: string,
  status?: string,
): Promise<MetaCampaign[]> {
  try {
    const params: Record<string, unknown> = {
      access_token: accessToken,
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,account_id',
      limit: 100,
    };
    if (status && status !== 'all') {
      params.effective_status = status === 'active' ? "['ACTIVE']" : "['PAUSED','ARCHIVED']";
    }

    return await fetchAllPages<MetaCampaign>(`${META_API}/${accountId}/campaigns`, params);
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Failed to fetch campaigns: ${e.message}`);
  }
}

export async function getMetaCampaign(campaignId: string, accessToken: string): Promise<MetaCampaign> {
  try {
    const { data } = await axios.get(`${META_API}/${campaignId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,account_id,bid_strategy',
      },
    });
    return data;
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Failed to fetch campaign: ${e.message}`);
  }
}

export async function createMetaCampaign(
  accountId: string,
  accessToken: string,
  params: { name: string; objective: string; status: string; daily_budget?: number },
): Promise<string> {
  try {
    const { data } = await axios.post(
      `${META_API}/${accountId}/campaigns`,
      {
        name: params.name,
        objective: params.objective,
        status: 'PAUSED', // Safety: always create paused
        ...(params.daily_budget ? { daily_budget: Math.round(params.daily_budget * 100) } : {}),
        special_ad_categories: [],
      },
      { params: { access_token: accessToken } },
    );
    return data.id;
  } catch (err) {
    const e = err as AxiosError<{ error?: { message?: string } }>;
    throw new PlatformError('meta', `Create failed: ${e.response?.data?.error?.message ?? e.message}`);
  }
}

export async function updateMetaCampaign(
  campaignId: string,
  accessToken: string,
  changes: Record<string, unknown>,
): Promise<void> {
  try {
    await axios.post(`${META_API}/${campaignId}`, changes, {
      params: { access_token: accessToken },
    });
  } catch (err) {
    const e = err as AxiosError<{ error?: { message?: string } }>;
    throw new PlatformError('meta', `Update failed: ${e.response?.data?.error?.message ?? e.message}`);
  }
}

// ─── Ad Sets & Ads ───────────────────────────────────────────

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  bid_amount?: string;
  targeting?: Record<string, unknown>;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  campaign_id?: string;
  creative?: Record<string, unknown>;
}

export async function getMetaAdSets(campaignId: string, accessToken: string): Promise<MetaAdSet[]> {
  try {
    return await fetchAllPages<MetaAdSet>(`${META_API}/${campaignId}/adsets`, {
      access_token: accessToken,
      fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,bid_strategy,bid_amount,targeting',
      limit: 200,
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Failed to fetch ad sets: ${e.message}`);
  }
}

export async function getMetaAds(adsetId: string, accessToken: string): Promise<MetaAd[]> {
  try {
    return await fetchAllPages<MetaAd>(`${META_API}/${adsetId}/ads`, {
      access_token: accessToken,
      fields: 'id,name,status,adset_id,campaign_id,creative{id,title,body,image_url,object_type}',
      limit: 200,
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Failed to fetch ads: ${e.message}`);
  }
}

// ─── Insights ────────────────────────────────────────────────

export async function getMetaInsights(
  objectId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string,
  breakdown?: string,
): Promise<Record<string, unknown>> {
  try {
    const params: Record<string, unknown> = {
      access_token: accessToken,
      time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
      fields: 'spend,impressions,clicks,ctr,conversions,cost_per_conversion,action_values,purchase_roas,frequency,reach,cpm,cpc,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions',
      level: 'campaign',
    };
    if (breakdown) params.breakdowns = breakdown;

    const { data } = await axios.get(`${META_API}/${objectId}/insights`, { params });
    return data.data?.[0] ?? {};
  } catch (err) {
    const e = err as AxiosError;
    throw new PlatformError('meta', `Insights failed: ${e.message}`);
  }
}

// ─── Normalization ───────────────────────────────────────────

export function normalizeMetaCampaign(mc: MetaCampaign): UnifiedCampaign {
  return {
    id: mc.id,
    ad_account_id: mc.account_id,
    platform: 'meta' as Platform,
    platform_campaign_id: mc.id,
    name: mc.name,
    status: mc.status === 'ACTIVE' ? 'active' : mc.status === 'PAUSED' ? 'paused' : 'ended',
    objective: mc.objective,
    daily_budget: mc.daily_budget ? parseInt(mc.daily_budget) / 100 : undefined,
    lifetime_budget: mc.lifetime_budget ? parseInt(mc.lifetime_budget) / 100 : undefined,
    budget_type: mc.daily_budget ? 'daily' : mc.lifetime_budget ? 'lifetime' : undefined,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    cpa: 0,
    roas: 0,
    frequency: 0,
    reach: 0,
    cpm: 0,
    cpc: 0,
    start_date: mc.start_time?.slice(0, 10),
    end_date: mc.stop_time?.slice(0, 10),
    platform_data: mc as unknown as Record<string, unknown>,
    created_at: mc.start_time ?? new Date().toISOString(),
  };
}
