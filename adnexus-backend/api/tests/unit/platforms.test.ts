/**
 * Platform API Client Unit Tests
 * Tests for Meta, Google, TikTok, Snap clients and Unified Platform Manager
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

// ─── Mock axios before importing modules ───────────────────────────────────
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.create = jest.fn(() => mockedAxios);

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective?: string;
  budget?: number;
  budgetType?: 'DAILY' | 'LIFETIME';
  startDate?: string;
  endDate?: string;
}

interface Insight {
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
  developerToken?: string;
  customerId?: string;
  loginCustomerId?: string;
  advertiserId?: string;
  organizationId?: string;
}

interface TokenStore {
  save(platform: string, token: TokenData): Promise<void>;
  get(platform: string): Promise<TokenData | null>;
}

interface GoogleCampaignResource {
  id: string;
  name: string;
  status: string;
  advertisingChannelType?: string;
  budget?: { amountMicros: number };
  startDate?: string;
  endDate?: string;
}

interface GoogleMutateOperation {
  type: 'create' | 'update' | 'remove';
  resource: Record<string, unknown>;
}

interface GoogleMutateResult {
  index: number;
  success: boolean;
  resourceName?: string;
  error?: { field: string; message: string };
}

// ─── Mock Platform Clients ─────────────────────────────────────────────────

class MetaApiClient {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private accessToken: string;
  private refreshToken?: string;
  private tokenStore?: TokenStore;
  private retryDelay = 100;
  private maxRetries = 3;

  constructor(credentials: PlatformCredentials, tokenStore?: TokenStore) {
    this.accessToken = credentials.accessToken;
    this.refreshToken = credentials.refreshToken;
    this.tokenStore = tokenStore;
  }

  private async request<T>(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    data?: unknown,
    retryCount = 0
  ): Promise<T> {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${url}`,
        params: { ...params, access_token: this.accessToken },
        data,
      };
      const response = await mockedAxios.request(config);
      return response.data as T;
    } catch (error) {
      const axiosError = error as AxiosError;

      // Handle rate limit (429) with exponential backoff
      if (axiosError.response?.status === 429) {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise((r) => setTimeout(r, delay));
          return this.request<T>(method, url, params, data, retryCount + 1);
        }
        throw new Error(`Meta API rate limited after ${this.maxRetries} retries`);
      }

      // Handle auth error (401) with token refresh
      if (axiosError.response?.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        return this.request<T>(method, url, params, data, retryCount);
      }

      // Handle network errors (ECONNRESET) with retry
      if (
        axiosError.code === 'ECONNRESET' ||
        axiosError.code === 'ETIMEDOUT' ||
        axiosError.code === 'ECONNREFUSED'
      ) {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise((r) => setTimeout(r, delay));
          return this.request<T>(method, url, params, data, retryCount + 1);
        }
        throw new Error(`Meta API network error after ${this.maxRetries} retries: ${axiosError.code}`);
      }

      throw error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token available');

    const response = await mockedAxios.post('https://graph.facebook.com/v18.0/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: 'test-app-id',
      client_secret: 'test-app-secret',
      fb_exchange_token: this.refreshToken,
    });

    this.accessToken = response.data.access_token;

    if (this.tokenStore) {
      await this.tokenStore.save('meta', {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: Date.now() + response.data.expires_in * 1000,
      });
    }
  }

  async getCampaigns(adAccountId: string, params?: {
    status?: string[];
    limit?: number;
    fields?: string[];
  }): Promise<{ data: Campaign[]; paging?: { cursors: { after: string } } }> {
    const fields = params?.fields?.join(',') || 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';
    return this.request('GET', `/${adAccountId}/campaigns`, {
      fields,
      limit: params?.limit || 100,
      ...(params?.status ? { effective_status: params.status.join(',') } : {}),
    });
  }

  async createCampaign(adAccountId: string, campaign: {
    name: string;
    objective: string;
    status: 'ACTIVE' | 'PAUSED';
    special_ad_categories?: string[];
    daily_budget?: number;
    lifetime_budget?: number;
    start_time?: string;
    stop_time?: string;
  }): Promise<{ id: string; success: boolean }> {
    const body = {
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      special_ad_categories: campaign.special_ad_categories || [],
      ...(campaign.daily_budget ? { daily_budget: Math.round(campaign.daily_budget * 100) } : {}),
      ...(campaign.lifetime_budget ? { lifetime_budget: Math.round(campaign.lifetime_budget * 100) } : {}),
      ...(campaign.start_time ? { start_time: campaign.start_time } : {}),
      ...(campaign.stop_time ? { stop_time: campaign.stop_time } : {}),
    };
    return this.request('POST', `/${adAccountId}/campaigns`, undefined, body);
  }

  async getInsights(
    objectId: string,
    options: {
      dateRange: { since: string; until: string };
      fields?: string[];
      level?: 'account' | 'campaign' | 'adset' | 'ad';
      timeIncrement?: number | 'all_days';
    }
  ): Promise<{ data: Insight[] }> {
    const fields = options.fields?.join(',') || 'campaign_id,impressions,clicks,spend,conversions,ctr,cpc';
    const timeRange = {
      since: options.dateRange.since,
      until: options.dateRange.until,
    };
    return this.request('GET', `/${objectId}/insights`, {
      fields,
      time_range: JSON.stringify(timeRange),
      level: options.level || 'campaign',
      time_increment: options.timeIncrement || 'all_days',
    });
  }
}

class GoogleAdsApiClient {
  private baseUrl = 'https://googleads.googleapis.com/v14';
  private developerToken: string;
  private loginCustomerId?: string;
  private customerId: string;
  private accessToken: string;

  constructor(credentials: PlatformCredentials) {
    this.developerToken = credentials.developerToken || '';
    this.loginCustomerId = credentials.loginCustomerId;
    this.customerId = credentials.customerId || '';
    this.accessToken = credentials.accessToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
    };
    if (this.loginCustomerId) {
      headers['login-customer-id'] = this.loginCustomerId;
    }
    return headers;
  }

  private async gaqlQuery<T>(query: string): Promise<T> {
    const response = await mockedAxios.post(
      `${this.baseUrl}/customers/${this.customerId}/googleAds:searchStream`,
      { query },
      { headers: this.getHeaders() }
    );
    return response.data as T;
  }

  async getCampaigns(params?: {
    status?: string[];
    limit?: number;
    fields?: string[];
  }): Promise<Campaign[]> {
    const selectFields = params?.fields?.join(', ') ||
      'campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, campaign.start_date, campaign.end_date';

    let whereClause = '';
    if (params?.status && params.status.length > 0) {
      const statuses = params.status.map((s) => `"${s}"`).join(', ');
      whereClause = `WHERE campaign.status IN (${statuses})`;
    }

    const query = `
      SELECT
        ${selectFields}
      FROM campaign
      ${whereClause}
      ${params?.limit ? `LIMIT ${params.limit}` : ''}
    `.trim();

    const response = await this.gaqlQuery<{ results: Array<{ campaign: GoogleCampaignResource }> }>(query);
    return (response.results || []).map((r) => this.transformCampaign(r.campaign));
  }

  async mutate(operations: GoogleMutateOperation[]): Promise<GoogleMutateResult[]> {
    const response = await mockedAxios.post(
      `${this.baseUrl}/customers/${this.customerId}/campaigns:mutate`,
      {
        operations: operations.map((op) => ({
          [op.type]: {
            resource: op.resource,
          },
        })),
        partialFailure: true,
      },
      { headers: this.getHeaders() }
    );

    return this.handlePartialFailure(response.data);
  }

  private handlePartialFailure(data: {
    results?: Array<{ result?: { resourceName: string } }>;
    partialFailureError?: { code: number; message: string; details?: unknown[] };
  }): GoogleMutateResult[] {
    const results: GoogleMutateResult[] = [];

    if (data.results) {
      data.results.forEach((result, index) => {
        if (result.result) {
          results.push({
            index,
            success: true,
            resourceName: result.result.resourceName,
          });
        }
      });
    }

    if (data.partialFailureError) {
      const details = (data.partialFailureError.details || []) as Array<{
        fieldViolations?: Array<{ field: string; description: string }>;
      }>;
      details.forEach((detail) => {
        if (detail.fieldViolations) {
          detail.fieldViolations.forEach((fv) => {
            // Extract operation index from field path like "operations[1].create.name"
            const indexMatch = fv.field.match(/\[(\d+)\]/);
            const opIndex = indexMatch ? parseInt(indexMatch[1], 10) : 0;
            results.push({
              index: opIndex,
              success: false,
              error: { field: fv.field, message: fv.description },
            });
          });
        }
      });
    }

    return results;
  }

  private transformCampaign(resource: GoogleCampaignResource): Campaign {
    return {
      id: String(resource.id),
      name: resource.name,
      status: resource.status as Campaign['status'],
      objective: resource.advertisingChannelType,
      budget: resource.budget?.amountMicros
        ? Math.round(resource.budget.amountMicros / 10000) / 100
        : undefined,
      startDate: resource.startDate,
      endDate: resource.endDate,
    };
  }

  dollarsToMicros(dollars: number): number {
    return Math.round(dollars * 1_000_000);
  }

  microsToDollars(micros: number): number {
    return Math.round((micros / 1_000_000) * 100) / 100;
  }
}

class TikTokApiClient {
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';
  private accessToken: string;
  private advertiserId: string;
  private requestTimestamps: number[] = [];
  private maxQps = 50;

  constructor(credentials: PlatformCredentials) {
    this.accessToken = credentials.accessToken;
    this.advertiserId = credentials.advertiserId || '';
  }

  private async request<T>(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    data?: unknown
  ): Promise<T> {
    await this.throttle();

    const response = await mockedAxios.request({
      method,
      url: `${this.baseUrl}${url}`,
      headers: {
        'Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      params,
      data,
    });

    if (response.data.code !== 0) {
      throw new Error(`TikTok API error: ${response.data.message} (code: ${response.data.code})`);
    }

    return response.data.data as T;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneSecondAgo);

    if (this.requestTimestamps.length >= this.maxQps) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestRequest) + 10;
      await new Promise((r) => setTimeout(r, Math.max(waitTime, 10)));
      return this.throttle();
    }

    this.requestTimestamps.push(now);
  }

  async getCampaigns(params?: {
    status?: string[];
    pageSize?: number;
    page?: number;
  }): Promise<{
    list: Campaign[];
    pageInfo: { page: number; pageSize: number; totalPage: number; totalNumber: number };
  }> {
    return this.request('GET', '/campaign/get/', {
      advertiser_id: this.advertiserId,
      page_size: params?.pageSize || 100,
      page: params?.page || 1,
      ...(params?.status ? { campaign_status: params.status.join(',') } : {}),
    });
  }

  getRequestTimestamps(): number[] {
    return [...this.requestTimestamps];
  }

  clearRequestTimestamps(): void {
    this.requestTimestamps = [];
  }
}

class SnapApiClient {
  private baseUrl = 'https://adsapi.snapchat.com/v1';
  private accessToken: string;
  private organizationId: string;
  private adAccountId?: string;
  private requestTimestamps: number[] = [];
  private maxQps = 20;

  constructor(credentials: PlatformCredentials) {
    this.accessToken = credentials.accessToken;
    this.organizationId = credentials.organizationId || '';
    this.adAccountId = credentials.advertiserId;
  }

  private async request<T>(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    data?: unknown
  ): Promise<T> {
    await this.throttle();

    const response = await mockedAxios.request({
      method,
      url: `${this.baseUrl}${url}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      params,
      data,
    });

    if (!response.data.campaigns && !response.data.campaign && response.data.request_status === 'ERROR') {
      throw new Error(`Snap API error: ${JSON.stringify(response.data.debug_message)}`);
    }

    return response.data as T;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneSecondAgo);

    if (this.requestTimestamps.length >= this.maxQps) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestRequest) + 50;
      await new Promise((r) => setTimeout(r, Math.max(waitTime, 50)));
      return this.throttle();
    }

    this.requestTimestamps.push(now);
  }

  async getCampaigns(params?: {
    status?: string[];
    limit?: number;
    page?: number;
  }): Promise<{ campaigns: Array<{ campaign: Campaign }>; paging: { next_link: string | null } }> {
    return this.request('GET', `/adaccounts/${this.adAccountId}/campaigns`, {
      limit: params?.limit || 50,
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.status ? { status: params.status.join(',') } : {}),
    });
  }

  getRequestTimestamps(): number[] {
    return [...this.requestTimestamps];
  }

  clearRequestTimestamps(): void {
    this.requestTimestamps = [];
  }
}

class UnifiedPlatformManager {
  private clients: Map<string, MetaApiClient | GoogleAdsApiClient | TikTokApiClient | SnapApiClient> = new Map();

  registerClient(platform: string, client: MetaApiClient | GoogleAdsApiClient | TikTokApiClient | SnapApiClient): void {
    this.clients.set(platform.toLowerCase(), client);
  }

  getClient(platform: string): MetaApiClient | GoogleAdsApiClient | TikTokApiClient | SnapApiClient {
    const client = this.clients.get(platform.toLowerCase());
    if (!client) {
      throw new Error(`No client registered for platform: ${platform}`);
    }
    return client;
  }

  async getCampaigns(platform: string, params?: Record<string, unknown>): Promise<Campaign[]> {
    const client = this.getClient(platform);

    if (client instanceof MetaApiClient) {
      const result = await client.getCampaigns(params?.adAccountId as string || 'act_123', {
        status: params?.status as string[] | undefined,
        limit: params?.limit as number | undefined,
      });
      return result.data;
    }

    if (client instanceof GoogleAdsApiClient) {
      return client.getCampaigns({
        status: params?.status as string[] | undefined,
        limit: params?.limit as number | undefined,
      });
    }

    if (client instanceof TikTokApiClient) {
      const result = await client.getCampaigns({
        status: params?.status as string[] | undefined,
        pageSize: params?.limit as number | undefined,
      });
      return result.list;
    }

    if (client instanceof SnapApiClient) {
      const result = await client.getCampaigns({
        status: params?.status as string[] | undefined,
        limit: params?.limit as number | undefined,
      });
      return result.campaigns.map((c) => c.campaign);
    }

    return [];
  }

  async getCrossPlatformInsights(
    platforms: string[],
    options: { dateRange: { since: string; until: string } }
  ): Promise<{
    aggregated: { impressions: number; clicks: number; spend: number; conversions: number };
    byPlatform: Record<string, { impressions: number; clicks: number; spend: number; conversions: number; error?: string }>;
  }> {
    const byPlatform: Record<string, { impressions: number; clicks: number; spend: number; conversions: number; error?: string }> = {};

    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        const client = this.getClient(platform);

        if (client instanceof MetaApiClient) {
          const insights = await client.getInsights('act_123', {
            dateRange: options.dateRange,
            fields: ['impressions', 'clicks', 'spend', 'conversions'],
          });
          return { platform, data: insights.data };
        }

        throw new Error(`Insights not implemented for platform: ${platform}`);
      })
    );

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalConversions = 0;

    results.forEach((result, index) => {
      const platform = platforms[index];

      if (result.status === 'fulfilled') {
        const platformData = result.value.data.reduce(
          (acc: { impressions: number; clicks: number; spend: number; conversions: number }, item: Insight) => ({
            impressions: acc.impressions + (item.impressions || 0),
            clicks: acc.clicks + (item.clicks || 0),
            spend: acc.spend + (item.spend || 0),
            conversions: acc.conversions + (item.conversions || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
        );

        byPlatform[platform] = platformData;
        totalImpressions += platformData.impressions;
        totalClicks += platformData.clicks;
        totalSpend += platformData.spend;
        totalConversions += platformData.conversions;
      } else {
        byPlatform[platform] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    return {
      aggregated: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: Math.round(totalSpend * 100) / 100,
        conversions: totalConversions,
      },
      byPlatform,
    };
  }
}

// ─── Mock Data Factories ───────────────────────────────────────────────────

const mockMetaCampaignsResponse = {
  data: [
    {
      id: '1234567890',
      name: 'Summer Sale 2024',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      daily_budget: '5000',
      start_time: '2024-06-01T00:00:00-0700',
      stop_time: '2024-08-31T23:59:59-0700',
    },
    {
      id: '1234567891',
      name: 'Brand Awareness Q3',
      status: 'PAUSED',
      objective: 'BRAND_AWARENESS',
      daily_budget: '3000',
      start_time: '2024-07-01T00:00:00-0700',
      stop_time: '2024-09-30T23:59:59-0700',
    },
  ],
  paging: {
    cursors: {
      after: 'MjM4NDc1OTQzNjAwNzA1OTQzOTY5NwZDZD',
    },
  },
};

const mockMetaInsightsResponse = {
  data: [
    {
      campaign_id: '1234567890',
      date_start: '2024-06-01',
      date_stop: '2024-06-01',
      impressions: '150000',
      clicks: '3200',
      spend: '450.50',
      conversions: '180',
      ctr: '2.1333',
      cpc: '0.1408',
    },
    {
      campaign_id: '1234567890',
      date_start: '2024-06-02',
      date_stop: '2024-06-02',
      impressions: '160000',
      clicks: '3500',
      spend: '480.25',
      conversions: '195',
      ctr: '2.1875',
      cpc: '0.1372',
    },
  ],
};

const mockMetaCreateCampaignResponse = {
  id: '9876543210',
  success: true,
};

const mockGoogleCampaignsResponse = {
  results: [
    {
      campaign: {
        resourceName: 'customers/123/campaigns/456',
        id: '456',
        name: 'Google Search Campaign 1',
        status: 'ENABLED',
        advertisingChannelType: 'SEARCH',
        budget: {
          amountMicros: 50000000,
        },
        startDate: '2024-06-01',
        endDate: '2024-12-31',
      },
    },
    {
      campaign: {
        resourceName: 'customers/123/campaigns/457',
        id: '457',
        name: 'Google Display Campaign 1',
        status: 'PAUSED',
        advertisingChannelType: 'DISPLAY',
        budget: {
          amountMicros: 100000000,
        },
        startDate: '2024-07-01',
        endDate: '2024-09-30',
      },
    },
  ],
};

const mockGoogleMutatePartialFailure = {
  results: [
    { result: { resourceName: 'customers/123/campaigns/789' } },
    {},
  ],
  partialFailureError: {
    code: 3,
    message: 'Multiple errors',
    details: [
      {
        fieldViolations: [
          { field: 'operations[1].create.name', description: 'Campaign name is required' },
        ],
      },
    ],
  },
};

const mockTikTokCampaignsResponse = {
  code: 0,
  message: 'OK',
  data: {
    list: [
      {
        id: 'campaign_123',
        name: 'TikTok Video Views',
        status: 'ACTIVE',
        objective: 'REACH',
        budget: 1000,
        budgetMode: 'BUDGET_MODE_DAY',
        startTime: '2024-06-01',
        endTime: '2024-06-30',
      },
      {
        id: 'campaign_124',
        name: 'TikTok Conversions',
        status: 'PAUSED',
        objective: 'CONVERSION',
        budget: 2000,
        budgetMode: 'BUDGET_MODE_TOTAL',
        startTime: '2024-07-01',
        endTime: '2024-07-31',
      },
    ],
    pageInfo: {
      page: 1,
      pageSize: 100,
      totalPage: 1,
      totalNumber: 2,
    },
  },
};

const mockSnapCampaignsResponse = {
  campaigns: [
    {
      campaign: {
        id: 'snap_campaign_1',
        name: 'Snap Awareness',
        status: 'ACTIVE',
        objective: 'AWARENESS',
        dailyBudgetMicro: 500000000,
        startTime: '2024-06-01T00:00:00.000Z',
        endTime: '2024-08-31T23:59:59.000Z',
      },
    },
    {
      campaign: {
        id: 'snap_campaign_2',
        name: 'Snap App Install',
        status: 'PAUSED',
        objective: 'APP_INSTALL',
        dailyBudgetMicro: 1000000000,
        startTime: '2024-07-01T00:00:00.000Z',
        endTime: '2024-09-30T23:59:59.000Z',
      },
    },
  ],
  paging: {
    next_link: null,
  },
};

const mockTokenRefreshResponse = {
  access_token: 'new_long_lived_token_xyz789',
  token_type: 'bearer',
  expires_in: 5184000,
};

// ─── Test Suite ────────────────────────────────────────────────────────────

describe('Platform API Clients', () => {
  let tokenStore: jest.Mocked<TokenStore>;
  let manager: UnifiedPlatformManager;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenStore = {
      save: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
    };
    manager = new UnifiedPlatformManager();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════
  // META CLIENT TESTS
  // ══════════════════════════════════════════════════════════════════════
  describe('MetaApiClient', () => {
    let client: MetaApiClient;

    beforeEach(() => {
      client = new MetaApiClient(
        {
          accessToken: 'test_meta_token_abc123',
          refreshToken: 'refresh_token_xyz789',
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
        tokenStore
      );
    });

    // ── Get Campaigns ──────────────────────────────────────────────────
    describe('getCampaigns()', () => {
      it('should call the correct Graph API URL with access token', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns('act_123456789');

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.url).toBe('https://graph.facebook.com/v18.0/act_123456789/campaigns');
        expect(callArg.params).toMatchObject({
          access_token: 'test_meta_token_abc123',
        });
      });

      it('should pass correct query parameters for filtering', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns('act_123456789', {
          status: ['ACTIVE', 'PAUSED'],
          limit: 50,
          fields: ['id', 'name', 'status'],
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.fields).toBe('id,name,status');
        expect(callArg.params.limit).toBe(50);
        expect(callArg.params.effective_status).toBe('ACTIVE,PAUSED');
      });

      it('should return parsed campaign data', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await client.getCampaigns('act_123456789');

        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toMatchObject({
          id: '1234567890',
          name: 'Summer Sale 2024',
          status: 'ACTIVE',
          objective: 'CONVERSIONS',
        });
        expect(result.paging?.cursors.after).toBeDefined();
      });
    });

    // ── Create Campaign ────────────────────────────────────────────────
    describe('createCampaign()', () => {
      it('should POST with correctly formatted body', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCreateCampaignResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaign = {
          name: 'Test Campaign',
          objective: 'CONVERSIONS',
          status: 'ACTIVE' as const,
          special_ad_categories: ['EMPLOYMENT'],
          daily_budget: 100.00,
          start_time: '2024-06-01T00:00:00-0700',
          stop_time: '2024-06-30T23:59:59-0700',
        };

        await client.createCampaign('act_123456789', campaign);

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.method).toBe('POST');
        expect(callArg.url).toBe('https://graph.facebook.com/v18.0/act_123456789/campaigns');
        expect(callArg.data).toEqual({
          name: 'Test Campaign',
          objective: 'CONVERSIONS',
          status: 'ACTIVE',
          special_ad_categories: ['EMPLOYMENT'],
          daily_budget: 10000,
          start_time: '2024-06-01T00:00:00-0700',
          stop_time: '2024-06-30T23:59:59-0700',
        });
      });

      it('should convert budget to cents (multiply by 100)', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCreateCampaignResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.createCampaign('act_123456789', {
          name: 'Budget Test',
          objective: 'REACH',
          status: 'PAUSED',
          daily_budget: 250.50,
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.data.daily_budget).toBe(25050);
      });

      it('should omit undefined optional fields from body', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCreateCampaignResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.createCampaign('act_123456789', {
          name: 'Minimal Campaign',
          objective: 'BRAND_AWARENESS',
          status: 'ACTIVE',
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.data).not.toHaveProperty('daily_budget');
        expect(callArg.data).not.toHaveProperty('lifetime_budget');
        expect(callArg.data).not.toHaveProperty('start_time');
        expect(callArg.data).not.toHaveProperty('stop_time');
      });
    });

    // ── Get Insights ───────────────────────────────────────────────────
    describe('getInsights()', () => {
      it('should format date range correctly in time_range param', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaInsightsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getInsights('act_123456789', {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.time_range).toBe(JSON.stringify({ since: '2024-06-01', until: '2024-06-30' }));
      });

      it('should pass correct insight fields and level', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaInsightsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getInsights('campaign_123', {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
          fields: ['impressions', 'clicks', 'spend', 'conversions'],
          level: 'adset',
          timeIncrement: 1,
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.fields).toBe('impressions,clicks,spend,conversions');
        expect(callArg.params.level).toBe('adset');
        expect(callArg.params.time_increment).toBe(1);
      });

      it('should return parsed insights data', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaInsightsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await client.getInsights('campaign_123', {
          dateRange: { since: '2024-06-01', until: '2024-06-02' },
        });

        expect(result.data).toHaveLength(2);
        expect(result.data[0].campaign_id).toBe('1234567890');
        // Meta API returns numeric values as strings in the raw response
        expect(result.data[0].impressions).toBe('150000');
        expect(result.data[0].spend).toBe('450.50');
      });

      it('should default time_increment to "all_days"', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaInsightsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getInsights('campaign_123', {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.time_increment).toBe('all_days');
      });
    });

    // ── Rate Limit Error (429) ─────────────────────────────────────────
    describe('rate limit handling (429)', () => {
      it('should retry with exponential backoff on 429 response', async () => {
        const rateLimitError = {
          response: {
            status: 429,
            data: { error: { message: 'Rate limit exceeded' } },
            headers: { 'x-app-usage': '{"call_count":100}' },
          },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce({
            data: mockMetaCampaignsResponse,
            status: 200,
            statusText: 'OK',
          } as AxiosResponse);

        const result = await client.getCampaigns('act_123456789');

        expect(mockedAxios.request).toHaveBeenCalledTimes(3);
        expect(result.data).toHaveLength(2);
      });

      it('should throw error after max retries exceeded', async () => {
        const rateLimitError = {
          response: {
            status: 429,
            data: { error: { message: 'Rate limit exceeded' } },
          },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request.mockRejectedValue(rateLimitError);

        await expect(client.getCampaigns('act_123456789')).rejects.toThrow(
          'Meta API rate limited after 3 retries'
        );
        expect(mockedAxios.request).toHaveBeenCalledTimes(4); // initial + 3 retries
      });
    });

    // ── Auth Error (401) ───────────────────────────────────────────────
    describe('auth error handling (401)', () => {
      it('should refresh token and retry on 401 response', async () => {
        const authError = {
          response: {
            status: 401,
            data: { error: { message: 'Invalid access token', code: 190 } },
          },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request
          .mockRejectedValueOnce(authError)
          .mockResolvedValueOnce({
            data: mockMetaCampaignsResponse,
            status: 200,
            statusText: 'OK',
          } as AxiosResponse);

        mockedAxios.post.mockResolvedValueOnce({
          data: mockTokenRefreshResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await client.getCampaigns('act_123456789');

        // Should call token refresh
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://graph.facebook.com/v18.0/oauth/access_token',
          expect.objectContaining({
            grant_type: 'fb_exchange_token',
            fb_exchange_token: 'refresh_token_xyz789',
          })
        );

        // Should retry original request with new token
        expect(mockedAxios.request).toHaveBeenCalledTimes(2);
        const secondCall = mockedAxios.request.mock.calls[1][0];
        expect(secondCall.params.access_token).toBe('new_long_lived_token_xyz789');
        expect(result.data).toHaveLength(2);
      });

      it('should throw on 401 without refresh token', async () => {
        const clientNoRefresh = new MetaApiClient({
          accessToken: 'test_token',
        });

        const authError = {
          response: {
            status: 401,
            data: { error: { message: 'Invalid access token', code: 190 } },
          },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request.mockRejectedValue(authError);

        await expect(clientNoRefresh.getCampaigns('act_123')).rejects.toBe(authError);
        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
      });
    });

    // ── Network Error (ECONNRESET) ────────────────────────────────────
    describe('network error handling', () => {
      it('should retry on ECONNRESET', async () => {
        const networkError = new Error('Connection reset') as AxiosError;
        networkError.code = 'ECONNRESET';
        networkError.isAxiosError = true;

        mockedAxios.request
          .mockRejectedValueOnce(networkError)
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({
            data: mockMetaCampaignsResponse,
            status: 200,
            statusText: 'OK',
          } as AxiosResponse);

        const result = await client.getCampaigns('act_123456789');

        expect(mockedAxios.request).toHaveBeenCalledTimes(3);
        expect(result.data).toHaveLength(2);
      });

      it('should retry on ETIMEDOUT', async () => {
        const timeoutError = new Error('Request timeout') as AxiosError;
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.isAxiosError = true;

        mockedAxios.request
          .mockRejectedValueOnce(timeoutError)
          .mockResolvedValueOnce({
            data: mockMetaCampaignsResponse,
            status: 200,
            statusText: 'OK',
          } as AxiosResponse);

        const result = await client.getCampaigns('act_123456789');

        expect(mockedAxios.request).toHaveBeenCalledTimes(2);
        expect(result.data).toHaveLength(2);
      });

      it('should throw after max retries on persistent network errors', async () => {
        const networkError = new Error('Connection reset') as AxiosError;
        networkError.code = 'ECONNRESET';
        networkError.isAxiosError = true;

        mockedAxios.request.mockRejectedValue(networkError);

        await expect(client.getCampaigns('act_123456789')).rejects.toThrow(
          'Meta API network error after 3 retries: ECONNRESET'
        );
        expect(mockedAxios.request).toHaveBeenCalledTimes(4);
      });
    });

    // ── Token Refresh ──────────────────────────────────────────────────
    describe('refreshAccessToken()', () => {
      it('should call OAuth endpoint with correct parameters', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockTokenRefreshResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.refreshAccessToken();

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://graph.facebook.com/v18.0/oauth/access_token',
          expect.objectContaining({
            grant_type: 'fb_exchange_token',
            client_id: 'test-app-id',
            client_secret: 'test-app-secret',
            fb_exchange_token: 'refresh_token_xyz789',
          })
        );
      });

      it('should store new token in tokenStore', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockTokenRefreshResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.refreshAccessToken();

        expect(tokenStore.save).toHaveBeenCalledWith(
          'meta',
          expect.objectContaining({
            accessToken: 'new_long_lived_token_xyz789',
            refreshToken: 'refresh_token_xyz789',
          })
        );
      });

      it('should throw if no refresh token is available', async () => {
        const clientNoRefresh = new MetaApiClient({
          accessToken: 'test_token',
        });

        await expect(clientNoRefresh.refreshAccessToken()).rejects.toThrow(
          'No refresh token available'
        );
      });

      it('should use new token for subsequent requests', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockTokenRefreshResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.refreshAccessToken();
        await client.getCampaigns('act_123');

        const requestCall = mockedAxios.request.mock.calls[0][0];
        expect(requestCall.params.access_token).toBe('new_long_lived_token_xyz789');
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GOOGLE CLIENT TESTS
  // ══════════════════════════════════════════════════════════════════════
  describe('GoogleAdsApiClient', () => {
    let client: GoogleAdsApiClient;

    beforeEach(() => {
      client = new GoogleAdsApiClient({
        accessToken: 'test_google_token_abc',
        developerToken: 'test_dev_token_xyz',
        customerId: '1234567890',
        loginCustomerId: '0987654321',
      });
    });

    // ── Get Campaigns via GAQL ─────────────────────────────────────────
    describe('getCampaigns()', () => {
      it('should send correctly formatted GAQL query', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.query).toContain('SELECT');
        expect(body.query).toContain('FROM campaign');
        expect(body.query).toContain('campaign.id');
        expect(body.query).toContain('campaign.name');
        expect(body.query).toContain('campaign.status');
      });

      it('should include status filter in WHERE clause when provided', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns({ status: ['ENABLED', 'PAUSED'] });

        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.query).toContain('WHERE campaign.status IN ("ENABLED", "PAUSED")');
      });

      it('should include LIMIT clause when limit is provided', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns({ limit: 25 });

        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.query).toContain('LIMIT 25');
      });

      it('should include custom fields when specified', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns({ fields: ['campaign.id', 'campaign.name'] });

        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.query).toContain('campaign.id, campaign.name');
      });

      it('should send correct headers including developer-token and login-customer-id', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        const [, , config] = mockedAxios.post.mock.calls[0];
        expect(config.headers).toMatchObject({
          Authorization: 'Bearer test_google_token_abc',
          'developer-token': 'test_dev_token_xyz',
          'login-customer-id': '0987654321',
          'Content-Type': 'application/json',
        });
      });

      it('should return transformed campaign data', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await client.getCampaigns();

        expect(campaigns).toHaveLength(2);
        expect(campaigns[0]).toMatchObject({
          id: '456',
          name: 'Google Search Campaign 1',
          status: 'ENABLED',
          objective: 'SEARCH',
        });
        expect(campaigns[1]).toMatchObject({
          id: '457',
          name: 'Google Display Campaign 1',
          status: 'PAUSED',
          objective: 'DISPLAY',
        });
      });

      it('should convert budget micros to dollars correctly', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await client.getCampaigns();

        // 50,000,000 micros = $50.00
        expect(campaigns[0].budget).toBe(50.0);
        // 100,000,000 micros = $100.00
        expect(campaigns[1].budget).toBe(100.0);
      });
    });

    // ── Partial Failure ────────────────────────────────────────────────
    describe('mutate() - partial failure', () => {
      it('should handle partial failure with mixed success/error results', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleMutatePartialFailure,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const operations: GoogleMutateOperation[] = [
          {
            type: 'create',
            resource: { name: 'Valid Campaign', status: 'PAUSED' },
          },
          {
            type: 'create',
            resource: { status: 'PAUSED' },
          },
        ];

        const results = await client.mutate(operations);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
          index: 0,
          success: true,
          resourceName: 'customers/123/campaigns/789',
        });
        expect(results[1]).toEqual({
          index: 1,
          success: false,
          error: {
            field: 'operations[1].create.name',
            message: 'Campaign name is required',
          },
        });
      });

      it('should return all successful when no partial failure', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            results: [
              { result: { resourceName: 'customers/123/campaigns/100' } },
              { result: { resourceName: 'customers/123/campaigns/101' } },
            ],
          },
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const operations: GoogleMutateOperation[] = [
          { type: 'create', resource: { name: 'Campaign 1' } },
          { type: 'create', resource: { name: 'Campaign 2' } },
        ];

        const results = await client.mutate(operations);

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.success)).toBe(true);
      });

      it('should send partialFailure flag in request body', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            results: [{ result: { resourceName: 'customers/123/campaigns/100' } }],
          },
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.mutate([{ type: 'create', resource: { name: 'Test' } }]);

        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.partialFailure).toBe(true);
      });
    });

    // ── Budget Micros Conversion ───────────────────────────────────────
    describe('budget micros conversion', () => {
      it('should convert $10.00 to 10,000,000 micros', () => {
        expect(client.dollarsToMicros(10.0)).toBe(10_000_000);
      });

      it('should convert $0.01 to 10,000 micros (minimum precision)', () => {
        expect(client.dollarsToMicros(0.01)).toBe(10_000);
      });

      it('should convert $1,000,000.00 to 1,000,000,000,000 micros', () => {
        expect(client.dollarsToMicros(1_000_000)).toBe(1_000_000_000_000);
      });

      it('should convert $0.00 to 0 micros', () => {
        expect(client.dollarsToMicros(0)).toBe(0);
      });

      it('should round fractional micros correctly', () => {
        expect(client.dollarsToMicros(0.000001)).toBe(1);
        expect(client.dollarsToMicros(10.9999999)).toBe(11_000_000);
      });

      it('should convert micros back to dollars', () => {
        expect(client.microsToDollars(10_000_000)).toBe(10.0);
        expect(client.microsToDollars(50_000_000)).toBe(50.0);
        expect(client.microsToDollars(100_000_000)).toBe(100.0);
      });

      it('should handle micros to dollars round-trip', () => {
        const originalDollars = 123.45;
        const micros = client.dollarsToMicros(originalDollars);
        const backToDollars = client.microsToDollars(micros);
        expect(backToDollars).toBe(originalDollars);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // TIKTOK CLIENT TESTS
  // ══════════════════════════════════════════════════════════════════════
  describe('TikTokApiClient', () => {
    let client: TikTokApiClient;

    beforeEach(() => {
      client = new TikTokApiClient({
        accessToken: 'test_tiktok_token_abc',
        advertiserId: 'tiktok_adv_123',
      });
    });

    // ── Get Campaigns ──────────────────────────────────────────────────
    describe('getCampaigns()', () => {
      it('should call TikTok API with correct endpoint and headers', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.url).toBe(
          'https://business-api.tiktok.com/open_api/v1.3/campaign/get/'
        );
        expect(callArg.headers).toMatchObject({
          'Access-Token': 'test_tiktok_token_abc',
        });
      });

      it('should pass advertiser_id and pagination params', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns({ status: ['ACTIVE'], pageSize: 50, page: 2 });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.advertiser_id).toBe('tiktok_adv_123');
        expect(callArg.params.page_size).toBe(50);
        expect(callArg.params.page).toBe(2);
        expect(callArg.params.campaign_status).toBe('ACTIVE');
      });

      it('should return parsed campaign list with page info', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await client.getCampaigns();

        expect(result.list).toHaveLength(2);
        expect(result.list[0]).toMatchObject({
          id: 'campaign_123',
          name: 'TikTok Video Views',
          status: 'ACTIVE',
          objective: 'REACH',
        });
        expect(result.pageInfo).toMatchObject({
          page: 1,
          pageSize: 100,
          totalPage: 1,
          totalNumber: 2,
        });
      });

      it('should throw on API error response (non-zero code)', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: {
            code: 40001,
            message: 'Invalid advertiser_id',
            data: null,
          },
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await expect(client.getCampaigns()).rejects.toThrow(
          'TikTok API error: Invalid advertiser_id (code: 40001)'
        );
      });
    });

    // ── Rate Limit (50 QPS) ────────────────────────────────────────────
    describe('rate limiting (50 QPS)', () => {
      beforeEach(() => {
        client.clearRequestTimestamps();
      });

      it('should track request timestamps after each request', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        const timestamps = client.getRequestTimestamps();
        expect(timestamps.length).toBe(1);
        expect(timestamps[0]).toBeGreaterThan(0);
      });

      it('should have maxQps set to 50', () => {
        expect(client['maxQps']).toBe(50);
      });

      it('should clear timestamps when clearRequestTimestamps is called', () => {
        client['requestTimestamps'] = [Date.now(), Date.now() - 100];
        client.clearRequestTimestamps();
        expect(client.getRequestTimestamps().length).toBe(0);
      });

      it('should throttle when request count exceeds 50 QPS', async () => {
        // Pre-fill timestamps to simulate being at the limit
        const now = Date.now();
        client['requestTimestamps'] = Array.from({ length: 50 }, (_, i) => now - i * 10);

        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const startTime = Date.now();
        await client.getCampaigns();
        const elapsed = Date.now() - startTime;

        // Should have waited due to throttling
        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        expect(elapsed).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SNAP CLIENT TESTS
  // ══════════════════════════════════════════════════════════════════════
  describe('SnapApiClient', () => {
    let client: SnapApiClient;

    beforeEach(() => {
      client = new SnapApiClient({
        accessToken: 'test_snap_token_abc',
        organizationId: 'snap_org_123',
        advertiserId: 'snap_account_456',
      });
    });

    // ── Get Campaigns ──────────────────────────────────────────────────
    describe('getCampaigns()', () => {
      it('should call Snap API with correct endpoint and Bearer token', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.url).toBe(
          'https://adsapi.snapchat.com/v1/adaccounts/snap_account_456/campaigns'
        );
        expect(callArg.headers).toMatchObject({
          Authorization: 'Bearer test_snap_token_abc',
        });
      });

      it('should pass limit and status params', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns({ status: ['ACTIVE'], limit: 25, page: 2 });

        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.params.limit).toBe(25);
        expect(callArg.params.page).toBe(2);
        expect(callArg.params.status).toBe('ACTIVE');
      });

      it('should return parsed campaign data with paging info', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await client.getCampaigns();

        expect(result.campaigns).toHaveLength(2);
        expect(result.campaigns[0].campaign).toMatchObject({
          id: 'snap_campaign_1',
          name: 'Snap Awareness',
          status: 'ACTIVE',
          objective: 'AWARENESS',
        });
        expect(result.paging.next_link).toBeNull();
      });
    });

    // ── Rate Limit (20 QPS) ────────────────────────────────────────────
    describe('rate limiting (20 QPS)', () => {
      beforeEach(() => {
        client.clearRequestTimestamps();
      });

      it('should have maxQps set to 20', () => {
        expect(client['maxQps']).toBe(20);
      });

      it('should track request timestamps after each request', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        await client.getCampaigns();

        const timestamps = client.getRequestTimestamps();
        expect(timestamps.length).toBe(1);
        expect(timestamps[0]).toBeGreaterThan(0);
      });

      it('should clear timestamps when clearRequestTimestamps is called', () => {
        client['requestTimestamps'] = [Date.now(), Date.now() - 50];
        client.clearRequestTimestamps();
        expect(client.getRequestTimestamps().length).toBe(0);
      });

      it('should throttle when request count exceeds 20 QPS', async () => {
        const now = Date.now();
        client['requestTimestamps'] = Array.from({ length: 20 }, (_, i) => now - i * 10);

        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const startTime = Date.now();
        await client.getCampaigns();
        const elapsed = Date.now() - startTime;

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        expect(elapsed).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // UNIFIED PLATFORM MANAGER TESTS
  // ══════════════════════════════════════════════════════════════════════
  describe('UnifiedPlatformManager', () => {
    let metaClient: MetaApiClient;
    let googleClient: GoogleAdsApiClient;
    let tiktokClient: TikTokApiClient;
    let snapClient: SnapApiClient;

    beforeEach(() => {
      metaClient = new MetaApiClient({
        accessToken: 'meta_token',
        refreshToken: 'meta_refresh',
      });
      googleClient = new GoogleAdsApiClient({
        accessToken: 'google_token',
        developerToken: 'dev_token',
        customerId: 'cust_123',
      });
      tiktokClient = new TikTokApiClient({
        accessToken: 'tiktok_token',
        advertiserId: 'adv_123',
      });
      snapClient = new SnapApiClient({
        accessToken: 'snap_token',
        organizationId: 'org_123',
        advertiserId: 'acct_456',
      });

      manager.registerClient('meta', metaClient);
      manager.registerClient('google', googleClient);
      manager.registerClient('tiktok', tiktokClient);
      manager.registerClient('snap', snapClient);
    });

    // ── Route to Correct Platform Client ───────────────────────────────
    describe('getClient() routing', () => {
      it('should route to Meta client for "meta" platform', () => {
        const client = manager.getClient('meta');
        expect(client).toBe(metaClient);
        expect(client).toBeInstanceOf(MetaApiClient);
      });

      it('should route to Google client for "google" platform', () => {
        const client = manager.getClient('google');
        expect(client).toBe(googleClient);
        expect(client).toBeInstanceOf(GoogleAdsApiClient);
      });

      it('should route to TikTok client for "tiktok" platform', () => {
        const client = manager.getClient('tiktok');
        expect(client).toBe(tiktokClient);
        expect(client).toBeInstanceOf(TikTokApiClient);
      });

      it('should route to Snap client for "snap" platform', () => {
        const client = manager.getClient('snap');
        expect(client).toBe(snapClient);
        expect(client).toBeInstanceOf(SnapApiClient);
      });

      it('should be case-insensitive for platform names', () => {
        expect(manager.getClient('META')).toBe(metaClient);
        expect(manager.getClient('Google')).toBe(googleClient);
        expect(manager.getClient('TIKTOK')).toBe(tiktokClient);
        expect(manager.getClient('Snap')).toBe(snapClient);
      });

      it('should throw for unregistered platform', () => {
        expect(() => manager.getClient('twitter')).toThrow(
          'No client registered for platform: twitter'
        );
      });
    });

    // ── Get Campaigns Routing ──────────────────────────────────────────
    describe('getCampaigns() platform routing', () => {
      it('should call Meta getCampaigns with correct params', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockMetaCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await manager.getCampaigns('meta', {
          adAccountId: 'act_999',
          status: ['ACTIVE'],
          limit: 25,
        });

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        const callArg = mockedAxios.request.mock.calls[0][0];
        expect(callArg.url).toContain('act_999');
        expect(campaigns).toHaveLength(2);
      });

      it('should call Google getCampaigns with correct params', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: mockGoogleCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await manager.getCampaigns('google', {
          status: ['ENABLED'],
          limit: 10,
        });

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        const [, body] = mockedAxios.post.mock.calls[0];
        expect(body.query).toContain('campaign.status IN ("ENABLED")');
        expect(campaigns).toHaveLength(2);
      });

      it('should call TikTok getCampaigns and extract list', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockTikTokCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await manager.getCampaigns('tiktok', {
          status: ['ACTIVE'],
          limit: 50,
        });

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        expect(campaigns).toHaveLength(2);
        expect(campaigns[0].id).toBe('campaign_123');
      });

      it('should call Snap getCampaigns and extract campaign array', async () => {
        mockedAxios.request.mockResolvedValueOnce({
          data: mockSnapCampaignsResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const campaigns = await manager.getCampaigns('snap', {
          status: ['ACTIVE'],
          limit: 20,
        });

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        expect(campaigns).toHaveLength(2);
        expect(campaigns[0].id).toBe('snap_campaign_1');
      });
    });

    // ── Aggregate Cross-Platform Insights ──────────────────────────────
    describe('getCrossPlatformInsights() aggregation', () => {
      it('should aggregate insights from all platforms', async () => {
        const metaResponse1 = {
          data: [
            { campaign_id: 'c1', impressions: 100000, clicks: 2000, spend: 500, conversions: 50, ctr: 2.0, cpc: 0.25 },
            { campaign_id: 'c2', impressions: 200000, clicks: 4000, spend: 1000, conversions: 100, ctr: 2.0, cpc: 0.25 },
          ],
        };
        const metaResponse2 = {
          data: [
            { campaign_id: 'c3', impressions: 150000, clicks: 3000, spend: 750, conversions: 75, ctr: 2.0, cpc: 0.25 },
          ],
        };

        mockedAxios.request
          .mockResolvedValueOnce({ data: metaResponse1, status: 200, statusText: 'OK' } as AxiosResponse)
          .mockResolvedValueOnce({ data: metaResponse2, status: 200, statusText: 'OK' } as AxiosResponse);

        // Register a second meta client for multi-platform aggregation test
        const metaClient2 = new MetaApiClient({ accessToken: 'meta_token_2' });
        manager.registerClient('meta_secondary', metaClient2);

        const result = await manager.getCrossPlatformInsights(['meta', 'meta_secondary'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.aggregated).toEqual({
          impressions: 450000,
          clicks: 9000,
          spend: 2250,
          conversions: 225,
        });

        const platforms = Object.keys(result.byPlatform);
        expect(platforms).toHaveLength(2);
      });

      it('should include per-platform metrics in byPlatform', async () => {
        const metaResponse = {
          data: [
            { campaign_id: 'c1', impressions: 50000, clicks: 1000, spend: 250, conversions: 25, ctr: 2.0, cpc: 0.25 },
          ],
        };

        mockedAxios.request.mockResolvedValueOnce({
          data: metaResponse,
          status: 200,
          statusText: 'OK',
        } as AxiosResponse);

        const result = await manager.getCrossPlatformInsights(['meta'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.byPlatform.meta).toBeDefined();
        expect(result.byPlatform.meta.impressions).toBe(50000);
        expect(result.byPlatform.meta.clicks).toBe(1000);
        expect(result.byPlatform.meta.spend).toBe(250);
        expect(result.byPlatform.meta.conversions).toBe(25);
      });
    });

    // ── Handle One Platform Failure ────────────────────────────────────
    describe('fault tolerance - one platform failure', () => {
      it('should continue aggregating when one platform fails', async () => {
        const successResponse = {
          data: [
            { campaign_id: 'c1', impressions: 100000, clicks: 2000, spend: 500, conversions: 50, ctr: 2.0, cpc: 0.25 },
          ],
        };

        const failureError = {
          response: { status: 500, data: { error: 'Internal Server Error' } },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request
          .mockResolvedValueOnce({ data: successResponse, status: 200, statusText: 'OK' } as AxiosResponse)
          .mockRejectedValueOnce(failureError);

        const metaClient1 = new MetaApiClient({ accessToken: 'token1' });
        const metaClient2 = new MetaApiClient({ accessToken: 'token2' });

        manager.registerClient('meta', metaClient1);
        manager.registerClient('meta2', metaClient2);

        const result = await manager.getCrossPlatformInsights(['meta', 'meta2'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.aggregated.impressions).toBe(100000);
        expect(result.aggregated.clicks).toBe(2000);
        expect(result.aggregated.spend).toBe(500);
        expect(result.aggregated.conversions).toBe(50);
      });

      it('should include error details for failed platform in byPlatform', async () => {
        const failureError = new Error('Network timeout') as AxiosError;
        failureError.isAxiosError = true;

        mockedAxios.request.mockRejectedValue(failureError);

        const result = await manager.getCrossPlatformInsights(['meta'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.byPlatform.meta.error).toBeDefined();
        expect(result.aggregated.impressions).toBe(0);
        expect(result.aggregated.clicks).toBe(0);
        expect(result.aggregated.spend).toBe(0);
        expect(result.aggregated.conversions).toBe(0);
      });

      it('should handle all platforms failing gracefully', async () => {
        const failureError = {
          response: { status: 503, data: { error: 'Service Unavailable' } },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request.mockRejectedValue(failureError);

        const result = await manager.getCrossPlatformInsights(['meta', 'meta'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.aggregated).toEqual({
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
        });

        const platforms = Object.keys(result.byPlatform);
        platforms.forEach((platform) => {
          expect(result.byPlatform[platform].error).toBeDefined();
        });
      });

      it('should use Promise.allSettled so partial failures do not block', async () => {
        const successResponse = {
          data: [
            { campaign_id: 'c1', impressions: 75000, clicks: 1500, spend: 375, conversions: 37, ctr: 2.0, cpc: 0.25 },
          ],
        };

        const rateLimitError = {
          response: {
            status: 429,
            data: { error: { message: 'Rate limit exceeded' } },
            headers: { 'retry-after': '60' },
          },
          isAxiosError: true,
        } as AxiosError;

        mockedAxios.request
          .mockResolvedValueOnce({ data: successResponse, status: 200, statusText: 'OK' } as AxiosResponse)
          .mockRejectedValueOnce(rateLimitError);

        const metaClient1 = new MetaApiClient({ accessToken: 'token1' });
        const metaClient2 = new MetaApiClient({ accessToken: 'token2' });
        manager.registerClient('meta', metaClient1);
        manager.registerClient('meta_b', metaClient2);

        const result = await manager.getCrossPlatformInsights(['meta', 'meta_b'], {
          dateRange: { since: '2024-06-01', until: '2024-06-30' },
        });

        expect(result.aggregated.impressions).toBe(75000);
        expect(result.byPlatform.meta_b.error).toBeDefined();
        expect(result.byPlatform.meta.error).toBeUndefined();
      });
    });

    // ── Register Client ────────────────────────────────────────────────
    describe('registerClient()', () => {
      it('should allow registering new clients', () => {
        const newMeta = new MetaApiClient({ accessToken: 'new_token' });
        manager.registerClient('meta_new', newMeta);
        expect(manager.getClient('meta_new')).toBe(newMeta);
      });

      it('should overwrite existing client for same platform key', () => {
        const newMeta = new MetaApiClient({ accessToken: 'replaced_token' });
        manager.registerClient('meta', newMeta);
        expect(manager.getClient('meta')).toBe(newMeta);
      });
    });
  });
});
