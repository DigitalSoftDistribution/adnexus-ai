/**
 * TikTok Ads API Client
 * ======================
 * Production-grade client for TikTok Marketing API v1.3.
 *
 * Features:
 * - OAuth 2.0 (authorization code + automatic refresh)
 * - 50 QPS token-bucket rate limiting
 * - Exponential backoff with full jitter, 3 retries
 * - Campaign & Ad CRUD operations
 * - Insight / reporting queries with derived metrics
 * - Strongly typed request/response shapes
 */

import {
  // Config & Tokens
  TikTokClientConfig,
  TikTokTokens,

  // Domain Models
  TikTokCampaign,
  TikTokCampaignCreate,
  TikTokCampaignUpdate,
  TikTokAd,
  TikTokAdCreate,
  TikTokAdUpdate,
  TikTokInsight,
  TikTokInsightParams,
  TikTokDateRange,
  TikTokListResponse,
  TikTokPagination,
  TikTokFilter,

  // Responses
  TikTokApiResponse,
  TikTokApiError,
  TikTokRateLimitError,
} from "./types";

import { TokenBucketRateLimiter } from "./rate-limiter";
import { TikTokTokenManager } from "./token-manager";
import {
  classifyError,
  isRetryableError,
  isTokenExpiredError,
  computeBackoff,
} from "./errors";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
const DEFAULT_AUTH_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
const DEFAULT_MAX_QPS = 50;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30000;

/** Metric columns fetched for insights. */
const DEFAULT_INSIGHT_METRICS = [
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "conversion_rate",
  "video_views",
  "video_watched_2s",
  "video_watched_6s",
  "video_play_actions",
  "likes",
  "comments",
  "shares",
  "follows",
  "profile_visits",
  "value_per_conversion",
  "cost_per_conversion",
  "result",
  "cost_per_result",
  "realtime_conversion",
  "realtime_cost_per_conversion",
];

// ─────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────

export class TikTokClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly tokenManager: TikTokTokenManager;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: TikTokClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.rateLimiter = new TokenBucketRateLimiter(
      this.config.maxQps ?? DEFAULT_MAX_QPS,
      this.config.maxQps ?? DEFAULT_MAX_QPS
    );

    this.tokenManager = new TikTokTokenManager(
      config.oauth,
      config.authBaseUrl ?? DEFAULT_AUTH_BASE_URL,
      config.onTokenRefresh
    );
  }

  // ═══════════════════════════════════════════
  //  AUTHENTICATION
  // ═══════════════════════════════════════════

  /**
   * Build the TikTok OAuth authorization URL.
   *
   * @param state   Optional CSRF/state parameter
   * @param extra   Additional query params (e.g., `redirect_uri` override)
   */
  getAuthorizationUrl(state?: string, extra?: Record<string, string>): string {
    return this.tokenManager.buildAuthUrl(state, extra);
  }

  /**
   * Exchange authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<TikTokTokens> {
    return this.tokenManager.exchangeCode(code);
  }

  /**
   * Inject pre-existing tokens (e.g., loaded from DB).
   */
  setTokens(tokens: TikTokTokens): void {
    this.tokenManager.setTokens(tokens);
  }

  /**
   * Get current tokens without network call.
   */
  getTokens(): TikTokTokens | null {
    return this.tokenManager.getTokens();
  }

  // ═══════════════════════════════════════════
  //  CAMPAIGN MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * List campaigns for an advertiser with optional filtering.
   */
  async getCampaigns(
    advertiserId: string,
    params?: {
      status?: string;
      objectiveType?: string;
      page?: number;
      pageSize?: number;
      filtering?: TikTokFilter[];
    }
  ): Promise<{ campaigns: TikTokCampaign[]; pagination: TikTokPagination }> {
    const qs = new URLSearchParams();
    qs.set("advertiser_id", advertiserId);
    if (params?.status) qs.set("status", params.status);
    if (params?.objectiveType) qs.set("objective_type", params.objectiveType);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("page_size", String(Math.min(params.pageSize, 1000)));
    if (params?.filtering) qs.set("filtering", JSON.stringify(params.filtering));

    const res = await this.request<TikTokApiResponse<TikTokListResponse<TikTokCampaign>>>(
      "GET",
      `/campaign/get/?${qs.toString()}`
    );

    const data = unwrap(res);
    return {
      campaigns: data.list ?? [],
      pagination: data.page_info ?? { page: 1, page_size: 10 },
    };
  }

  /**
   * Get a single campaign by ID.
   */
  async getCampaign(campaignId: string, advertiserId: string): Promise<TikTokCampaign | null> {
    const { campaigns } = await this.getCampaigns(advertiserId, {
      filtering: [
        { field_name: "campaign_id", filter_type: "IN", filter_value: [campaignId] },
      ],
      pageSize: 1,
    });
    return campaigns[0] ?? null;
  }

  /**
   * Create a new campaign.
   */
  async createCampaign(data: TikTokCampaignCreate): Promise<TikTokCampaign> {
    const res = await this.request<TikTokApiResponse<{ campaign_id: string; list: TikTokCampaign[] }>>(
      "POST",
      "/campaign/create/",
      data as unknown as Record<string, unknown>
    );
    const body = unwrap(res);
    // TikTok returns the campaign in the list array
    return (body.list?.[0] ?? { campaign_id: body.campaign_id, ...data }) as TikTokCampaign;
  }

  /**
   * Update an existing campaign.
   */
  async updateCampaign(campaignId: string, data: Omit<TikTokCampaignUpdate, "campaign_id">): Promise<void> {
    await this.request<TikTokApiResponse<unknown>>(
      "POST",
      "/campaign/update/",
      { campaign_id: campaignId, ...data }
    );
  }

  // ═══════════════════════════════════════════
  //  AD MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * List ads under a campaign (optionally filtered by adgroup).
   */
  async getAds(
    advertiserId: string,
    opts?: {
      campaignId?: string;
      adgroupId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ ads: TikTokAd[]; pagination: TikTokPagination }> {
    const qs = new URLSearchParams();
    qs.set("advertiser_id", advertiserId);
    if (opts?.campaignId) qs.set("campaign_id", opts.campaignId);
    if (opts?.adgroupId) qs.set("adgroup_id", opts.adgroupId);
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.pageSize) qs.set("page_size", String(Math.min(opts.pageSize, 1000)));

    const res = await this.request<TikTokApiResponse<TikTokListResponse<TikTokAd>>>(
      "GET",
      `/ad/get/?${qs.toString()}`
    );

    const data = unwrap(res);
    return {
      ads: data.list ?? [],
      pagination: data.page_info ?? { page: 1, page_size: 10 },
    };
  }

  /**
   * Get a single ad by ID.
   */
  async getAd(adId: string, advertiserId: string): Promise<TikTokAd | null> {
    const { ads } = await this.getAds(advertiserId, {
      // TikTok ad/get doesn't support filtering by ad_id directly,
      // so we fetch and filter client-side as fallback
    });
    return ads.find((a) => a.ad_id === adId) ?? null;
  }

  /**
   * Create a new ad.
   */
  async createAd(data: TikTokAdCreate): Promise<TikTokAd> {
    const res = await this.request<TikTokApiResponse<{ ad_id: string; list: TikTokAd[] }>>(
      "POST",
      "/ad/create/",
      data as unknown as Record<string, unknown>
    );
    const body = unwrap(res);
    return (body.list?.[0] ?? { ad_id: body.ad_id, ...data }) as TikTokAd;
  }

  /**
   * Update an existing ad.
   */
  async updateAd(adId: string, data: Omit<TikTokAdUpdate, "ad_id">): Promise<void> {
    await this.request<TikTokApiResponse<unknown>>(
      "POST",
      "/ad/update/",
      { ad_id: adId, ...data }
    );
  }

  // ═══════════════════════════════════════════
  //  AD GROUP MANAGEMENT (Bonus)
  // ═══════════════════════════════════════════

  /**
   * List ad groups for an advertiser.
   */
  async getAdGroups(
    advertiserId: string,
    opts?: {
      campaignId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
      filtering?: TikTokFilter[];
    }
  ): Promise<{ adGroups: import("./types").TikTokAdGroup[]; pagination: TikTokPagination }> {
    const qs = new URLSearchParams();
    qs.set("advertiser_id", advertiserId);
    if (opts?.campaignId) qs.set("campaign_ids", JSON.stringify([opts.campaignId]));
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.page) qs.set("page", String(opts.page));
    if (opts?.pageSize) qs.set("page_size", String(Math.min(opts.pageSize, 1000)));
    if (opts?.filtering) qs.set("filtering", JSON.stringify(opts.filtering));

    const res = await this.request<
      TikTokApiResponse<TikTokListResponse<import("./types").TikTokAdGroup>>
    >("GET", `/adgroup/get/?${qs.toString()}`);

    const data = unwrap(res);
    return {
      adGroups: data.list ?? [],
      pagination: data.page_info ?? { page: 1, page_size: 10 },
    };
  }

  // ═══════════════════════════════════════════
  //  INSIGHTS / REPORTING
  // ═══════════════════════════════════════════

  /**
   * Get campaign-level insights with derived metrics (CTR, CPC, CPA, ROAS).
   */
  async getCampaignInsights(
    campaignId: string,
    advertiserId: string,
    dateRange: TikTokDateRange,
    opts?: {
      metrics?: string[];
      dimensions?: string[];
      page?: number;
      pageSize?: number;
    }
  ): Promise<TikTokInsight[]> {
    const params: TikTokInsightParams = {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: opts?.dimensions ?? ["campaign_id", "stat_time_day"],
      metrics: opts?.metrics ?? DEFAULT_INSIGHT_METRICS,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      filtering: [
        {
          field_name: "campaign_id",
          filter_type: "IN",
          filter_value: [campaignId],
        },
      ],
      page: opts?.page ?? 1,
      page_size: Math.min(opts?.pageSize ?? 100, 1000),
      service_type: "AUCTION",
    };

    const res = await this.request<
      TikTokApiResponse<TikTokListResponse<TikTokInsight>>
    >("GET", `/report/integrated/get/?${toQueryString(params)}`);

    const data = unwrap(res);
    const insights = data.list ?? [];

    // Compute derived metrics
    return insights.map((row) => this.computeDerivedMetrics(row));
  }

  /**
   * Get insights for multiple campaigns at once.
   */
  async getMultiCampaignInsights(
    advertiserId: string,
    dateRange: TikTokDateRange,
    opts?: {
      campaignIds?: string[];
      page?: number;
      pageSize?: number;
    }
  ): Promise<TikTokInsight[]> {
    const params: TikTokInsightParams = {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: ["campaign_id", "stat_time_day"],
      metrics: DEFAULT_INSIGHT_METRICS,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      page: opts?.page ?? 1,
      page_size: Math.min(opts?.pageSize ?? 100, 1000),
      service_type: "AUCTION",
    };

    if (opts?.campaignIds && opts.campaignIds.length > 0) {
      params.filtering = [
        {
          field_name: "campaign_id",
          filter_type: "IN",
          filter_value: opts.campaignIds,
        },
      ];
    }

    const res = await this.request<
      TikTokApiResponse<TikTokListResponse<TikTokInsight>>
    >("GET", `/report/integrated/get/?${toQueryString(params)}`);

    const data = unwrap(res);
    return (data.list ?? []).map((row) => this.computeDerivedMetrics(row));
  }

  /**
   * Get ad-level insights.
   */
  async getAdInsights(
    adId: string,
    advertiserId: string,
    dateRange: TikTokDateRange,
    opts?: { page?: number; pageSize?: number }
  ): Promise<TikTokInsight[]> {
    const params: TikTokInsightParams = {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_AD",
      dimensions: ["ad_id", "stat_time_day"],
      metrics: DEFAULT_INSIGHT_METRICS,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      filtering: [
        { field_name: "ad_id", filter_type: "IN", filter_value: [adId] },
      ],
      page: opts?.page ?? 1,
      page_size: Math.min(opts?.pageSize ?? 100, 1000),
      service_type: "AUCTION",
    };

    const res = await this.request<
      TikTokApiResponse<TikTokListResponse<TikTokInsight>>
    >("GET", `/report/integrated/get/?${toQueryString(params)}`);

    const data = unwrap(res);
    return (data.list ?? []).map((row) => this.computeDerivedMetrics(row));
  }

  // ═══════════════════════════════════════════
  //  CORE HTTP ENGINE
  // ═══════════════════════════════════════════

  /**
   * Execute an HTTP request against the TikTok API.
   * Handles auth, rate limiting, retries, and error classification.
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    // Acquire rate-limit token
    await this.rateLimiter.acquire();

    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const accessToken = await this.tokenManager.getAccessToken();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const fetchOpts: RequestInit = {
          method,
          headers: {
            "Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        };

        if (body && method !== "GET") {
          fetchOpts.body = JSON.stringify(body);
        }

        const res = await fetch(url, fetchOpts);
        clearTimeout(timeout);

        // Handle empty body (rare)
        const text = await res.text();
        const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

        if (!res.ok || (json.code && json.code !== 0)) {
          const err = classifyError({
            url,
            method,
            requestId: (json.request_id as string) || "unknown",
            statusCode: res.status,
            responseBody: json as Record<string, unknown>,
          });

          // If token expired, force refresh and retry immediately
          if (isTokenExpiredError(err)) {
            await this.tokenManager.getAccessToken(); // triggers refresh
            if (attempt < this.maxRetries) continue;
          }

          // If rate limited, release token and apply backoff
          if (err instanceof TikTokRateLimitError) {
            this.rateLimiter.release();
            if (attempt < this.maxRetries) {
              await sleep(err.retryAfterMs);
              continue;
            }
          }

          throw err;
        }

        return json as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry auth errors or non-retryable API errors
        if (error instanceof TikTokApiError && !error.isRetryable) {
          throw error;
        }

        // Retry transient errors with backoff
        if (isRetryableError(error) && attempt < this.maxRetries) {
          const delay = computeBackoff(attempt, this.baseDelayMs);
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error(`Request failed after ${this.maxRetries} retries`);
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  /**
   * Compute CTR, CPC, CPA, ROAS from raw metrics.
   */
  private computeDerivedMetrics(insight: TikTokInsight): TikTokInsight {
    const m = insight.metrics;
    const impressions = m.impressions || 0;
    const clicks = m.clicks || 0;
    const spend = m.spend || 0;
    const conversions = m.conversions || 0;
    const conversionValue = m.value_per_conversion || 0;

    m.ctr = impressions > 0 ? clicks / impressions : 0;
    m.cpc = clicks > 0 ? spend / clicks : 0;
    m.cpa = conversions > 0 ? spend / conversions : 0;
    m.roas = spend > 0 ? (conversions * conversionValue) / spend : 0;

    return insight;
  }

  /**
   * Access the rate limiter for health checks.
   */
  getRateLimiter(): TokenBucketRateLimiter {
    return this.rateLimiter;
  }
}

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════

/** Unwrap TikTok's response envelope. */
function unwrap<T>(res: TikTokApiResponse<T>): T {
  if (res.code !== 0) {
    throw new Error(`TikTok API error: ${res.message} (code: ${res.code})`);
  }
  return res.data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serialize insight params to query string. */
function toQueryString(params: TikTokInsightParams): string {
  const qs = new URLSearchParams();
  qs.set("advertiser_id", params.advertiser_id);
  qs.set("report_type", params.report_type);
  qs.set("data_level", params.data_level!);
  qs.set("dimensions", JSON.stringify(params.dimensions));
  qs.set("metrics", JSON.stringify(params.metrics));
  qs.set("start_date", params.start_date);
  qs.set("end_date", params.end_date);
  qs.set("service_type", params.service_type ?? "AUCTION");
  if (params.filtering) qs.set("filtering", JSON.stringify(params.filtering));
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.order_field) qs.set("order_field", params.order_field);
  if (params.order_type) qs.set("order_type", params.order_type);
  return qs.toString();
}
