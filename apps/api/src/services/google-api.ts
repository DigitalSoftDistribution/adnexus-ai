import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { PlatformError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { getModuleLogger } from '../lib/logger';
import type { Platform, UnifiedCampaign, UnifiedAdSet, UnifiedAd } from '../types';

const logger = getModuleLogger('google-api');

const GOOGLE_ADS_API = config.google.adsApiUrl;
const GOOGLE_OAUTH_URL = config.google.oauthUrl;
const GOOGLE_TOKEN_URL = config.google.tokenUrl;
const GOOGLE_TOKEN_INFO_URL = config.google.tokenInfoUrl;

// ─── Types ───────────────────────────────────────────────────

export interface FetchOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface GoogleCampaign {
  resource_name: string;
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' | 'UNSPECIFIED';
  advertising_channel_type: string;
  campaign_budget: string;
  start_date: string;
  end_date?: string;
  customer_id?: string;
}

export interface GoogleAdGroup {
  resource_name: string;
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' | 'UNSPECIFIED';
  campaign: string;
  cpc_bid_micros?: string;
  cpm_bid_micros?: string;
  cpv_bid_micros?: string;
  target_cpa_micros?: string;
}

export interface GoogleAd {
  resource_name: string;
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN' | 'UNSPECIFIED';
  ad_group: string;
  ad?: {
    id?: string;
    name?: string;
    type?: string;
    final_urls?: string[];
    responsive_search_ad?: {
      headlines?: Array<{ text: string }>;
      descriptions?: Array<{ text: string }>;
    };
    responsive_display_ad?: {
      marketing_images?: Array<{ asset: string }>;
      headlines?: Array<{ text: string }>;
      descriptions?: Array<{ text: string }>;
    };
  };
}

export interface GoogleInsight {
  campaign_id: string;
  campaign_name: string;
  status: string;
  advertising_channel_type: string;
  metrics_clicks: string;
  metrics_impressions: string;
  metrics_ctr: string;
  metrics_average_cpc: string;
  metrics_cost_micros: string;
  metrics_conversions: string;
  metrics_conversions_value: string;
  metrics_view_through_conversions: string;
  campaign_start_date: string;
  campaign_end_date?: string;
}

export interface AccountInsights {
  account_id: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_cpc: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  view_through_conversions: number;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleAccessibleCustomer {
  resource_name: string;
  id: string;
  descriptive_name?: string;
  currency_code?: string;
  time_zone?: string;
  auto_tagging_enabled?: boolean;
}

interface GoogleMutateResponse {
  results?: Array<{
    resource_name: string;
  }>;
  partial_failure_error?: {
    message: string;
    details?: Array<{ error_code?: { code: string }; message: string }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function getCustomerIdFromResource(resourceName: string): string {
  const match = resourceName.match(/customers\/(\d+)/);
  return match?.[1] ?? '';
}

function extractIdFromResource(resourceName: string): string {
  const match = resourceName.match(/\/(\d+)$/);
  return match?.[1] ?? resourceName;
}

function microsToCurrency(micros: string | number | undefined): number {
  if (micros === undefined || micros === '') return 0;
  return Number(micros) / 1_000_000;
}

function currencyToMicros(amount: number): number {
  return Math.round(amount * 1_000_000);
}

function googleHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': config.google.developerToken,
    'Content-Type': 'application/json',
  };
}

function mapGoogleStatus(status: string): 'active' | 'paused' | 'ended' | 'draft' {
  switch (status) {
    case 'ENABLED':
      return 'active';
    case 'PAUSED':
      return 'paused';
    case 'REMOVED':
      return 'ended';
    default:
      return 'draft';
  }
}

function mapGoogleObjective(channelType: string): string {
  const objectiveMap: Record<string, string> = {
    SEARCH: 'SALES',
    DISPLAY: 'AWARENESS',
    SHOPPING: 'SALES',
    VIDEO: 'AWARENESS',
    MULTI_CHANNEL: 'SALES',
    DISCOVERY: 'AWARENESS',
    LOCAL: 'SALES',
    SMART: 'SALES',
    PERFORMANCE_MAX: 'SALES',
    HOTEL: 'SALES',
    TRAVEL: 'SALES',
    DEMAND_GEN: 'LEADS',
    UNKNOWN: 'AWARENESS',
  };
  return objectiveMap[channelType] ?? 'AWARENESS';
}

// ─── GAQL Search Helper ──────────────────────────────────────

async function searchGoogleAds<T>(
  customerId: string,
  accessToken: string,
  query: string,
): Promise<T[]> {
  const results: T[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const requestBody: Record<string, unknown> = { query, page_size: 1000 };
      if (pageToken) requestBody.page_token = pageToken;

      const { data } = await axios.post<{
        results?: T[];
        total_results_count?: string;
        next_page_token?: string;
        field_mask?: string;
      }>(
        `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`,
        requestBody,
        { headers: googleHeaders(accessToken) },
      );

      if (data.results) {
        results.push(...data.results);
      }

      pageToken = data.next_page_token;
    } while (pageToken);

    return results;
  } catch (err) {
    const e = err as AxiosError<{ error?: { message?: string; details?: Array<{ errors?: Array<{ message: string }> }> } }>;
    const details = e.response?.data?.error?.details;
    const firstError = details?.[0]?.errors?.[0]?.message;
    throw new PlatformError('google', `Search query failed: ${firstError ?? e.response?.data?.error?.message ?? e.message}`);
  }
}

// ─── Mutate Helper ───────────────────────────────────────────

async function mutateGoogleAds(
  customerId: string,
  accessToken: string,
  operations: unknown[],
  partialFailure = true,
): Promise<GoogleMutateResponse> {
  try {
    const { data } = await axios.post<GoogleMutateResponse>(
      `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:mutate`,
      { partial_failure: partialFailure, operations },
      { headers: googleHeaders(accessToken) },
    );

    if (data.partial_failure_error) {
      throw new PlatformError('google', `Mutate partially failed: ${data.partial_failure_error.message}`);
    }

    return data;
  } catch (err) {
    const e = err as AxiosError<{ error?: { message?: string; details?: Array<{ errors?: Array<{ message: string }> }> } }>;
    if (e instanceof PlatformError) throw e;
    const details = e.response?.data?.error?.details;
    const firstError = details?.[0]?.errors?.[0]?.message;
    throw new PlatformError('google', `Mutate failed: ${firstError ?? e.response?.data?.error?.message ?? e.message}`);
  }
}

// ─── OAuth ───────────────────────────────────────────────────

export async function getGoogleAuthUrl(workspaceId: string): Promise<string> {
  const redirectUri = `${config.frontend.url}/auth/google/callback`;
  const scopes = ['https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/userinfo.email'];

  const state = Buffer.from(JSON.stringify({ workspaceId, redirectUri })).toString('base64url');

  const url = new URL(GOOGLE_OAUTH_URL);
  url.searchParams.set('client_id', config.google.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  logger.info({ workspaceId }, "Generated OAuth URL");
  return url.toString();
}

export async function handleGoogleCallback(code: string, workspaceId: string): Promise<import('../types').AdAccount> {
  try {
    // 1. Exchange code for tokens
    const redirectUri = `${config.frontend.url}/auth/google/callback`;
    const { data: tokenData } = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    logger.info("OAuth code exchanged successfully");

    if (!tokenData.access_token) {
      throw new PlatformError('google', 'No access token in OAuth response');
    }

    // 2. Get list of accessible customers (MCC accounts the user has access to)
    const { data: accessibleCustomers } = await axios.get<{
      resource_names?: string[];
    }>(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
      headers: googleHeaders(tokenData.access_token),
    });

    const customerResourceNames = accessibleCustomers.resource_names ?? [];
    if (customerResourceNames.length === 0) {
      throw new PlatformError('google', 'No accessible Google Ads accounts found');
    }

    // 3. Get details for the first accessible customer
    const primaryCustomerId = getCustomerIdFromResource(customerResourceNames[0]);

    // 4. Query customer details using GAQL
    const customerDetails = await searchGoogleAds<{
      customer: {
        resource_name: string;
        id: string;
        descriptive_name?: string;
        currency_code?: string;
        time_zone?: string;
        auto_tagging_enabled?: boolean;
      };
    }>(
      primaryCustomerId,
      tokenData.access_token,
      `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.auto_tagging_enabled FROM customer`,
    );

    const customer = customerDetails[0]?.customer;
    if (!customer) {
      throw new PlatformError('google', 'Failed to fetch customer details');
    }

    // 5. Calculate token expiry
    const expiresIn = tokenData.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 6. Store token in database
    const { error: tokenError } = await supabase
      .from('platform_tokens')
      .upsert(
        {
          workspace_id: workspaceId,
          platform: 'google',
          account_id: customer.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          expires_at: expiresAt.toISOString(),
          metadata: {
            name: customer.descriptive_name ?? `Account ${customer.id}`,
            currency_code: customer.currency_code,
            time_zone: customer.time_zone,
            auto_tagging_enabled: customer.auto_tagging_enabled,
          },
        },
        { onConflict: 'workspace_id,platform,account_id' },
      );

    if (tokenError) {
      logger.error({ err: tokenError }, "Failed to store token");
      throw new PlatformError('google', `Token storage failed: ${tokenError.message}`);
    }

    logger.info({ customerId: customer.id, name: customer.descriptive_name }, "Account connected");

    return {
      id: `${workspaceId}_google_${customer.id}`,
      workspace_id: workspaceId,
      platform: 'google' as Platform,
      account_id: customer.id,
      name: customer.descriptive_name ?? `Google Ads ${customer.id}`,
      status: 'active',
      token_expires_at: expiresAt.toISOString(),
      metadata: {
        currency_code: customer.currency_code,
        time_zone: customer.time_zone,
        auto_tagging_enabled: customer.auto_tagging_enabled,
      },
      created_at: '' as unknown as string,
    };
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError<{ error?: { message?: string } }>;
    throw new PlatformError('google', `OAuth callback failed: ${e.response?.data?.error?.message ?? e.message}`);
  }
}

// ─── Campaign CRUD ───────────────────────────────────────────

export async function fetchGoogleCampaigns(
  accountId: string,
  accessToken: string,
  options?: FetchOptions,
): Promise<GoogleCampaign[]> {
  try {
    let whereClause = '';
    if (options?.status && options.status !== 'all') {
      const statusFilter = options.status === 'active' ? "campaign.status = 'ENABLED'" : "campaign.status != 'ENABLED'";
      whereClause = `WHERE ${statusFilter}`;
    }

    const query = `
      SELECT
        campaign.resource_name,
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.campaign_budget,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      ${whereClause}
      ORDER BY campaign.id DESC
    `.trim();

    logger.info({ accountId }, "Fetching campaigns");

    const results = await searchGoogleAds<{
      campaign: GoogleCampaign;
    }>(accountId, accessToken, query);

    return results.map((r) => ({
      ...r.campaign,
      customer_id: accountId,
    }));
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Failed to fetch campaigns: ${e.message}`);
  }
}

export async function createGoogleCampaign(
  accessToken: string,
  accountId: string,
  campaign: Partial<GoogleCampaign>,
): Promise<string> {
  try {
    if (!campaign.name) {
      throw new PlatformError('google', 'Campaign name is required');
    }

    const budgetResourceName = `customers/${accountId}/campaignBudgets/${Date.now()}`;

    // Create a campaign budget first
    const budgetOperation = {
      create: {
        resource_name: budgetResourceName,
        name: `Budget for ${campaign.name}`,
        amount_micros: campaign.campaign_budget
          ? String(currencyToMicros(parseFloat(campaign.campaign_budget)))
          : '5000000', // Default $5
        delivery_method: 'STANDARD',
        explicitly_shared: false,
      },
    };

    const campaignResourceName = `customers/${accountId}/campaigns/${Date.now()}`;

    const campaignOperation = {
      create: {
        resource_name: campaignResourceName,
        name: campaign.name,
        status: 'PAUSED', // Safety: always create paused
        advertising_channel_type: campaign.advertising_channel_type ?? 'SEARCH',
        campaign_budget: budgetResourceName,
        start_date: campaign.start_date ?? new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        ...(campaign.end_date ? { end_date: campaign.end_date.replace(/-/g, '') } : {}),
      },
    };

    const mutateResponse = await mutateGoogleAds(
      accountId,
      accessToken,
      [
        { campaign_budget_operation: budgetOperation },
        { campaign_operation: campaignOperation },
      ],
    );

    const createdResource = mutateResponse.results?.[1]?.resource_name ?? mutateResponse.results?.[0]?.resource_name;
    if (!createdResource) {
      throw new PlatformError('google', 'Campaign creation returned no resource name');
    }

    const campaignId = extractIdFromResource(createdResource);
    logger.info({ campaignId, name: campaign.name }, "Campaign created");
    return campaignId;
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Create campaign failed: ${e.message}`);
  }
}

export async function updateGoogleCampaign(
  accessToken: string,
  campaignId: string,
  updates: Partial<GoogleCampaign>,
): Promise<void> {
  try {
    const customerId = updates.customer_id ?? getCustomerIdFromResource(campaignId);
    const resourceName = campaignId.includes('/') ? campaignId : `customers/${customerId}/campaigns/${campaignId}`;

    const updateMask: string[] = [];
    const updateData: Record<string, unknown> = { resource_name: resourceName };

    if (updates.name) {
      updateData.name = updates.name;
      updateMask.push('name');
    }

    if (updates.status) {
      updateData.status = updates.status;
      updateMask.push('status');
    }

    if (updates.start_date) {
      updateData.start_date = updates.start_date.replace(/-/g, '');
      updateMask.push('start_date');
    }

    if (updates.end_date) {
      updateData.end_date = updates.end_date.replace(/-/g, '');
      updateMask.push('end_date');
    }

    if (updateMask.length === 0) {
      logger.info({ campaignId }, "No fields to update for campaign");
      return;
    }

    await mutateGoogleAds(
      customerId,
      accessToken,
      [
        {
          campaign_operation: {
            update: updateData,
            update_mask: { paths: updateMask },
          },
        },
      ],
    );

    logger.info({ campaignId, updateMask: updateMask.join(", ") }, "Campaign updated");
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Update campaign failed: ${e.message}`);
  }
}

export async function deleteGoogleCampaign(
  accessToken: string,
  campaignId: string,
): Promise<void> {
  try {
    const customerId = getCustomerIdFromResource(campaignId);
    const resourceName = campaignId.includes('/') ? campaignId : `customers/${customerId}/campaigns/${campaignId}`;

    await mutateGoogleAds(
      customerId,
      accessToken,
      [
        {
          campaign_operation: {
            remove: resourceName,
          },
        },
      ],
    );

    logger.info({ campaignId }, "Campaign removed");
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Delete campaign failed: ${e.message}`);
  }
}

// ─── Ad Group CRUD ───────────────────────────────────────────

export async function fetchGoogleAdGroups(
  campaignId: string,
  accessToken: string,
): Promise<GoogleAdGroup[]> {
  try {
    const customerId = getCustomerIdFromResource(campaignId);
    const campaignResourceName = campaignId.includes('/')
      ? campaignId
      : `customers/${customerId}/campaigns/${campaignId}`;

    const query = `
      SELECT
        ad_group.resource_name,
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign,
        ad_group.cpc_bid_micros,
        ad_group.cpm_bid_micros,
        ad_group.cpv_bid_micros
      FROM ad_group
      WHERE ad_group.campaign = '${campaignResourceName}'
      ORDER BY ad_group.id DESC
    `.trim();

    logger.info({ campaignId }, "Fetching ad groups");

    const results = await searchGoogleAds<{
      adGroup: GoogleAdGroup;
    }>(customerId, accessToken, query);

    return results.map((r) => r.adGroup);
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Failed to fetch ad groups: ${e.message}`);
  }
}

export async function createGoogleAdGroup(
  accessToken: string,
  campaignId: string,
  adGroup: Partial<GoogleAdGroup>,
): Promise<string> {
  try {
    if (!adGroup.name) {
      throw new PlatformError('google', 'Ad group name is required');
    }

    const customerId = getCustomerIdFromResource(campaignId);
    const campaignResourceName = campaignId.includes('/')
      ? campaignId
      : `customers/${customerId}/campaigns/${campaignId}`;

    const adGroupResourceName = `customers/${customerId}/adGroups/${Date.now()}`;

    const operation = {
      ad_group_operation: {
        create: {
          resource_name: adGroupResourceName,
          name: adGroup.name,
          campaign: campaignResourceName,
          status: 'PAUSED', // Safety: always create paused
          ...(adGroup.cpc_bid_micros ? { cpc_bid_micros: adGroup.cpc_bid_micros } : {}),
          type: 'SEARCH_STANDARD',
        },
      },
    };

    const mutateResponse = await mutateGoogleAds(customerId, accessToken, [operation]);

    const createdResource = mutateResponse.results?.[0]?.resource_name;
    if (!createdResource) {
      throw new PlatformError('google', 'Ad group creation returned no resource name');
    }

    const adGroupId = extractIdFromResource(createdResource);
    logger.info({ adGroupId, name: adGroup.name }, "Ad group created");
    return adGroupId;
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Create ad group failed: ${e.message}`);
  }
}

// ─── Ad CRUD ─────────────────────────────────────────────────

export async function fetchGoogleAds(
  adGroupId: string,
  accessToken: string,
): Promise<GoogleAd[]> {
  try {
    const customerId = getCustomerIdFromResource(adGroupId);
    const adGroupResourceName = adGroupId.includes('/')
      ? adGroupId
      : `customers/${customerId}/adGroups/${adGroupId}`;

    const query = `
      SELECT
        ad_group_ad.resource_name,
        ad_group_ad.ad_group,
        ad_group_ad.status,
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_display_ad.marketing_images,
        ad_group_ad.ad.responsive_display_ad.headlines,
        ad_group_ad.ad.responsive_display_ad.descriptions
      FROM ad_group_ad
      WHERE ad_group_ad.ad_group = '${adGroupResourceName}'
      ORDER BY ad_group_ad.ad.id DESC
    `.trim();

    logger.info({ adGroupId }, "Fetching ads");

    const results = await searchGoogleAds<{
      adGroupAd: GoogleAd;
    }>(customerId, accessToken, query);

    return results.map((r) => r.adGroupAd);
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Failed to fetch ads: ${e.message}`);
  }
}

export async function createGoogleAd(
  accessToken: string,
  adGroupId: string,
  ad: Partial<GoogleAd>,
): Promise<string> {
  try {
    if (!ad.name) {
      throw new PlatformError('google', 'Ad name is required');
    }

    const customerId = getCustomerIdFromResource(adGroupId);
    const adGroupResourceName = adGroupId.includes('/')
      ? adGroupId
      : `customers/${customerId}/adGroups/${adGroupId}`;

    const adResourceName = `customers/${customerId}/ads/${Date.now()}`;

    // Build a responsive search ad by default
    const adOperation = {
      ad_group_ad_operation: {
        create: {
          status: 'PAUSED', // Safety: always create paused
          ad_group: adGroupResourceName,
          ad: {
            resource_name: adResourceName,
            name: ad.name,
            final_urls: ad.ad?.final_urls ?? [`https://example.com`],
            responsive_search_ad: {
              headlines: ad.ad?.responsive_search_ad?.headlines ?? [
                { text: 'Headline 1' },
                { text: 'Headline 2' },
                { text: 'Headline 3' },
              ],
              descriptions: ad.ad?.responsive_search_ad?.descriptions ?? [
                { text: 'Description 1' },
                { text: 'Description 2' },
              ],
            },
          },
        },
      },
    };

    const mutateResponse = await mutateGoogleAds(customerId, accessToken, [adOperation]);

    const createdResource = mutateResponse.results?.[0]?.resource_name;
    if (!createdResource) {
      throw new PlatformError('google', 'Ad creation returned no resource name');
    }

    const adId = extractIdFromResource(createdResource);
    logger.info({ adId, name: ad.name }, "Ad created");
    return adId;
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Create ad failed: ${e.message}`);
  }
}

// ─── Insights ────────────────────────────────────────────────

export async function fetchGoogleInsights(
  campaignIds: string[],
  accessToken: string,
  dateRange: DateRange,
): Promise<GoogleInsight[]> {
  try {
    if (campaignIds.length === 0) return [];

    const customerId = getCustomerIdFromResource(campaignIds[0]);
    const formattedStart = dateRange.start.replace(/-/g, '-');
    const formattedEnd = dateRange.end.replace(/-/g, '-');

    // Build resource name filter
    const resourceNames = campaignIds.map((id) => {
      const cid = getCustomerIdFromResource(id);
      const campaignId = id.includes('/') ? extractIdFromResource(id) : id;
      return `customers/${cid}/campaigns/${campaignId}`;
    });

    const resourceNameFilter = resourceNames.map((rn) => `campaign.resource_name = '${rn}'`).join(' OR ');

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.view_through_conversions
      FROM campaign
      WHERE ${resourceNameFilter}
        AND segments.date BETWEEN '${formattedStart}' AND '${formattedEnd}'
      ORDER BY metrics.cost_micros DESC
    `.trim();

    logger.info({ campaignCount: campaignIds.length, dateFrom: formattedStart, dateTo: formattedEnd }, "Fetching insights");

    const results = await searchGoogleAds<{
      campaign: {
        resource_name: string;
        id: string;
        name: string;
        status: string;
        advertising_channel_type: string;
        start_date: string;
        end_date?: string;
      };
      metrics: {
        clicks: string;
        impressions: string;
        ctr: string;
        averageCpc: string;
        costMicros: string;
        conversions: string;
        conversionsValue: string;
        viewThroughConversions: string;
      };
    }>(customerId, accessToken, query);

    return results.map((r) => ({
      campaign_id: r.campaign.id,
      campaign_name: r.campaign.name,
      status: r.campaign.status,
      advertising_channel_type: r.campaign.advertising_channel_type,
      metrics_clicks: r.metrics.clicks,
      metrics_impressions: r.metrics.impressions,
      metrics_ctr: r.metrics.ctr,
      metrics_average_cpc: r.metrics.averageCpc,
      metrics_cost_micros: r.metrics.costMicros,
      metrics_conversions: r.metrics.conversions,
      metrics_conversions_value: r.metrics.conversionsValue,
      metrics_view_through_conversions: r.metrics.viewThroughConversions,
      campaign_start_date: r.campaign.start_date,
      campaign_end_date: r.campaign.end_date,
    }));
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Fetch insights failed: ${e.message}`);
  }
}

export async function fetchGoogleAccountInsights(
  accountId: string,
  accessToken: string,
  dateRange: DateRange,
): Promise<AccountInsights> {
  try {
    const formattedStart = dateRange.start.replace(/-/g, '-');
    const formattedEnd = dateRange.end.replace(/-/g, '-');

    const query = `
      SELECT
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.view_through_conversions
      FROM customer
      WHERE segments.date BETWEEN '${formattedStart}' AND '${formattedEnd}'
    `.trim();

    logger.info({ accountId }, "Fetching account insights");

    const results = await searchGoogleAds<{
      metrics: {
        clicks: string;
        impressions: string;
        ctr: string;
        averageCpc: string;
        costMicros: string;
        conversions: string;
        conversionsValue: string;
        viewThroughConversions: string;
      };
    }>(accountId, accessToken, query);

    const m = results[0]?.metrics;

    return {
      account_id: accountId,
      clicks: m ? parseInt(m.clicks) : 0,
      impressions: m ? parseInt(m.impressions) : 0,
      ctr: m ? parseFloat(m.ctr) : 0,
      average_cpc: m ? microsToCurrency(m.averageCpc) : 0,
      spend: m ? microsToCurrency(m.costMicros) : 0,
      conversions: m ? parseFloat(m.conversions) : 0,
      conversion_value: m ? parseFloat(m.conversionsValue) : 0,
      view_through_conversions: m ? parseFloat(m.viewThroughConversions) : 0,
    };
  } catch (err) {
    if (err instanceof PlatformError) throw err;
    const e = err as AxiosError;
    throw new PlatformError('google', `Fetch account insights failed: ${e.message}`);
  }
}

// ─── Normalization ───────────────────────────────────────────

export async function normalizeGoogleCampaign(
  campaign: GoogleCampaign,
  insights?: GoogleInsight,
): Promise<UnifiedCampaign> {
  const campaignId = extractIdFromResource(campaign.resource_name);
  const customerId = campaign.customer_id ?? getCustomerIdFromResource(campaign.resource_name);

  // Parse date from YYYYMMDD to YYYY-MM-DD
  const parseDate = (d: string | undefined): string | undefined => {
    if (!d || d.length !== 8) return undefined;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  };

  const status = mapGoogleStatus(campaign.status);
  const objective = mapGoogleObjective(campaign.advertising_channel_type);

  // Calculate metrics from insights if available
  const spend = insights ? microsToCurrency(insights.metrics_cost_micros) : 0;
  const impressions = insights ? parseInt(insights.metrics_impressions) : 0;
  const clicks = insights ? parseInt(insights.metrics_clicks) : 0;
  const ctr = insights ? parseFloat(insights.metrics_ctr) : 0;
  const conversions = insights ? parseFloat(insights.metrics_conversions) : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? (insights ? parseFloat(insights.metrics_conversions_value) : 0) / spend : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  return {
    id: campaignId,
    ad_account_id: customerId,
    platform: 'google' as Platform,
    platform_campaign_id: campaignId,
    name: campaign.name,
    status,
    objective,
    daily_budget: undefined, // Would require fetching campaign budget separately
    lifetime_budget: undefined,
    budget_type: undefined,
    spend,
    impressions,
    clicks,
    ctr,
    conversions,
    cpa,
    roas,
    frequency: 0, // Not directly available at campaign level
    reach: 0, // Would require separate GAQL query
    cpm,
    cpc,
    start_date: parseDate(campaign.start_date),
    end_date: parseDate(campaign.end_date),
    platform_data: campaign as unknown as Record<string, unknown>,
    created_at: parseDate(campaign.start_date) ?? '',
  };
}

export async function normalizeGoogleAdGroup(adGroup: GoogleAdGroup): Promise<UnifiedAdSet> {
  const adGroupId = extractIdFromResource(adGroup.resource_name);
  const campaignId = extractIdFromResource(adGroup.campaign);

  return {
    id: adGroupId,
    campaign_id: campaignId,
    platform_adset_id: adGroupId,
    name: adGroup.name,
    status: mapGoogleStatus(adGroup.status),
    daily_budget: undefined,
    bid_strategy: undefined,
    bid_amount: adGroup.cpc_bid_micros ? microsToCurrency(adGroup.cpc_bid_micros) : undefined,
    targeting: {}, // Would require fetching criteria separately
    created_at: '' as unknown as string,
  };
}

export async function normalizeGoogleAd(ad: GoogleAd): Promise<UnifiedAd> {
  const adId = ad.ad?.id ?? extractIdFromResource(ad.resource_name);
  const adGroupId = extractIdFromResource(ad.ad_group);

  // Extract creative text from the ad
  let creativeText = '';
  if (ad.ad?.responsive_search_ad) {
    const headlines = ad.ad.responsive_search_ad.headlines?.map((h) => h.text).join(' | ') ?? '';
    const descriptions = ad.ad.responsive_search_ad.descriptions?.map((d) => d.text).join(' ') ?? '';
    creativeText = `${headlines} - ${descriptions}`;
  } else if (ad.ad?.responsive_display_ad) {
    const headlines = ad.ad.responsive_display_ad.headlines?.map((h) => h.text).join(' | ') ?? '';
    const descriptions = ad.ad.responsive_display_ad.descriptions?.map((d) => d.text).join(' ') ?? '';
    creativeText = `${headlines} - ${descriptions}`;
  }

  return {
    id: adId,
    adset_id: adGroupId,
    platform_ad_id: adId,
    name: ad.ad?.name ?? ad.name ?? `Ad ${adId}`,
    status: mapGoogleStatus(ad.status),
    creative_type: ad.ad?.type,
    creative_url: ad.ad?.final_urls?.[0],
    creative_text: creativeText || undefined,
    spend: 0, // Not available at this query level
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    cpa: 0,
    roas: 0,
    frequency: 0,
    fatigue_score: 0,
    fatigue_status: 'healthy',
    created_at: '' as unknown as string,
  };
}

// ─── Token Management ────────────────────────────────────────

export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  try {
    logger.info("Refreshing access token");

    const { data } = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    if (!data.access_token) {
      throw new PlatformError('google', 'No access token in refresh response');
    }

    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    logger.info({ expiresAt: expiresAt.toISOString() }, "Token refreshed");

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (err) {
    const e = err as AxiosError<{ error?: { message?: string } }>;
    throw new PlatformError('google', `Token refresh failed: ${e.response?.data?.error?.message ?? e.message}`);
  }
}

export async function validateGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const { data } = await axios.get<{
      expires_in?: number;
      scope?: string;
    }>(GOOGLE_TOKEN_INFO_URL, {
      params: { access_token: accessToken },
    });

    // Check if token is expired
    if (data.expires_in !== undefined && data.expires_in <= 0) {
      logger.info("Token is expired");
      return false;
    }

    // Verify it has the adwords scope
    const hasAdwordsScope = data.scope?.includes('adwords') ?? false;
    if (!hasAdwordsScope) {
      logger.info("Token missing adwords scope");
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err }, "Token validation failed");
    return false;
  }
}

// ─── Default Export ──────────────────────────────────────────

export const googleApi = {
  // OAuth
  getGoogleAuthUrl,
  handleGoogleCallback,

  // Campaign CRUD
  fetchGoogleCampaigns,
  createGoogleCampaign,
  updateGoogleCampaign,
  deleteGoogleCampaign,

  // Ad Group CRUD
  fetchGoogleAdGroups,
  createGoogleAdGroup,

  // Ad CRUD
  fetchGoogleAds,
  createGoogleAd,

  // Insights
  fetchGoogleInsights,
  fetchGoogleAccountInsights,

  // Normalization
  normalizeGoogleCampaign,
  normalizeGoogleAdGroup,
  normalizeGoogleAd,

  // Token Management
  refreshGoogleToken,
  validateGoogleToken,
} as const;

export default googleApi;
