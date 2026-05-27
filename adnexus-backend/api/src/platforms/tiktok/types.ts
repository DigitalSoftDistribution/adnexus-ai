/**
 * TikTok Ads API — Type Definitions
 * ==================================
 * Comprehensive type system for the TikTok Marketing API v1.3+
 * Covers campaigns, ads, ad groups, insights, and OAuth flows.
 */

// ─────────────────────────────────────────────
// OAuth / Authentication
// ─────────────────────────────────────────────

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: "Bearer";
  scope: string[];
}

export interface TikTokRefreshTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string[];
}

export interface TikTokOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

// ─────────────────────────────────────────────
// Pagination & Common
// ──────────────────────────────��─────────────

export interface TikTokPagination {
  page: number;
  page_size: number;
  total_number?: number;
  total_page?: number;
}

export interface TikTokListParams extends Partial<TikTokPagination> {
  advertiser_id: string;
}

export interface TikTokDateRange {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

// ─────────────────────────────────────────────
// API Response Wrapper
// ─────────────────────────────────────────────

export interface TikTokApiResponse<T> {
  code: number;
  message: string;
  request_id: string;
  data: T;
}

export interface TikTokListResponse<T> {
  list: T[];
  page_info: TikTokPagination;
}

// ─────────────────────────────────────────────
// Campaign
// ─────────────────────────────────────────────

export type TikTokCampaignStatus =
  | "ENABLE"
  | "DISABLE"
  | "DELETE"
  | "ALL"
  | "CAMPAIGN_STATUS_ENABLE"
  | "CAMPAIGN_STATUS_DISABLE";

export type TikTokObjectiveType =
  | "APP_PROMOTION"
  | "CONVERSIONS"
  | "LEAD_GENERATION"
  | "PRODUCT_SALES"
  | "TRAFFIC"
  | "VIDEO_VIEWS"
  | "REACH"
  | "AWARENESS";

export type TikTokBudgetMode = "BUDGET_MODE_INFINITE" | "BUDGET_MODE_DAY" | "BUDGET_MODE_TOTAL";

export interface TikTokCampaign {
  campaign_id: string;
  advertiser_id: string;
  campaign_name: string;
  status: TikTokCampaignStatus;
  objective_type: TikTokObjectiveType;
  budget_mode: TikTokBudgetMode;
  budget?: number;
  spend_cap?: number;
  create_time: string;
  modify_time: string;
  is_new_structure?: boolean;
  is_smart_performance_campaign?: boolean;
  roas_bid?: number;
  special_industries?: string[];
}

export interface TikTokCampaignCreate {
  advertiser_id: string;
  campaign_name: string;
  objective_type: TikTokObjectiveType;
  budget_mode: TikTokBudgetMode;
  budget?: number;
  campaign_type?: "REGULAR_CAMPAIGN" | "IOS14_CAMPAIGN";
  is_smart_performance_campaign?: boolean;
  roas_bid?: number;
}

export type TikTokCampaignUpdate = Partial<
  Omit<TikTokCampaignCreate, "advertiser_id" | "objective_type">
> & {
  campaign_id: string;
};

// ─────────────────────────────────────────────
// Ad Group
// ─────────────────────────────────────────────

export type TikTokAdGroupStatus =
  | "ENABLE"
  | "DISABLE"
  | "DELETE"
  | "ADGROUP_STATUS_ENABLE"
  | "ADGROUP_STATUS_DISABLE";

export interface TikTokAdGroup {
  adgroup_id: string;
  advertiser_id: string;
  campaign_id: string;
  adgroup_name: string;
  status: TikTokAdGroupStatus;
  placement_type: "PLACEMENT_TYPE_AUTOMATIC" | "PLACEMENT_TYPE_NORMAL";
  placements?: string[];
  promotion_target_type?: string;
  create_time: string;
  modify_time: string;
  budget?: number;
  budget_mode?: TikTokBudgetMode;
  schedule_type?: "SCHEDULE_START_END" | "SCHEDULE_FROM_NOW";
  schedule_start_time?: string;
  schedule_end_time?: string;
  bid_type?: string;
  deep_bid_type?: string;
  optimization_event?: string;
  billing_event?: string;
}

// ─────────────────────────────────────────────
// Ad (Creative)
// ─────────────────────────────────────────────

export type TikTokAdStatus =
  | "ENABLE"
  | "DISABLE"
  | "DELETE"
  | "AD_STATUS_ENABLE"
  | "AD_STATUS_DISABLE"
  | "AD_STATUS_AUDIT"
  | "AD_STATUS_NOT_APPROVE";

export type TikTokAdFormat =
  | "SINGLE_IMAGE"
  | "SINGLE_VIDEO"
  | "CAROUSEL_ADS"
  | "CATALOG_AD"
  | "DPA";

export interface TikTokAd {
  ad_id: string;
  advertiser_id: string;
  campaign_id: string;
  adgroup_id: string;
  ad_name: string;
  status: TikTokAdStatus;
  ad_format?: TikTokAdFormat;
  identity_type?: string;
  identity_id?: string;
  create_time: string;
  modify_time: string;
  video_id?: string;
  image_ids?: string[];
  ad_text?: string;
  call_to_action?: string;
  landing_page_url?: string;
  display_name?: string;
  profile_image?: string;
}

export interface TikTokAdCreate {
  advertiser_id: string;
  adgroup_id: string;
  ad_name: string;
  identity_type: string;
  identity_id: string;
  ad_format?: TikTokAdFormat;
  video_id?: string;
  image_ids?: string[];
  ad_text?: string;
  call_to_action?: string;
  landing_page_url?: string;
  display_name?: string;
  profile_image?: string;
  creative_material_mode?: "CUSTOM" | "DYNAMIC";
  page_id?: string;
  attribution_event_set_id?: string;
}

export type TikTokAdUpdate = Partial<
  Omit<TikTokAdCreate, "advertiser_id" | "adgroup_id">
> & {
  ad_id: string;
};

// ─────────────────────────────────────────────
// Insights / Reporting
// ─────────────────────────────────────────────

export interface TikTokInsight {
  dimensions: {
    campaign_id?: string;
    adgroup_id?: string;
    ad_id?: string;
    advertiser_id?: string;
    stat_time_day?: string;
    stat_time_hour?: string;
  };
  metrics: {
    // Core performance
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    conversion_rate: number;

    // Derived metrics (computed by client)
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;

    // Engagement
    video_views?: number;
    video_watched_2s?: number;
    video_watched_6s?: number;
    video_play_actions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    follows?: number;
    profile_visits?: number;

    // Attribution
    value_per_conversion?: number;
    cost_per_conversion?: number;
    conversion_rate_v2?: number;
    result?: number;
    cost_per_result?: number;
    result_rate?: number;
    realtime_conversion?: number;
    realtime_cost_per_conversion?: number;
  };
}

export interface TikTokInsightParams {
  advertiser_id: string;
  report_type: "BASIC" | "AUDIENCE" | "PLAYABLE_MATERIAL" | "CATALOG";
  dimensions?: string[];
  metrics?: string[];
  start_date: string;
  end_date: string;
  service_type?: "AUCTION" | "RESERVATION" | "HOUSE_AD";
  data_level?: "AUCTION_AD" | "AUCTION_ADGROUP" | "AUCTION_CAMPAIGN" | "AUCTION_ADVERTISER";
  filtering?: TikTokFilter[];
  page?: number;
  page_size?: number;
  order_field?: string;
  order_type?: "ASC" | "DESC";
}

export interface TikTokFilter {
  field_name: string;
  filter_type: "IN" | "MATCH" | "GREATER_THAN" | "LESS_THAN";
  filter_value: string[];
}

// ─────────────────────────────────────────────
// Client Configuration
// ─────────────────────────────────────────────

export interface TikTokClientConfig {
  /** OAuth app credentials */
  oauth: TikTokOAuthConfig;
  /** Base URL for TikTok Marketing API (default: https://business-api.tiktok.com/open_api/v1.3) */
  baseUrl?: string;
  /** Auth base URL (default: https://ads.tiktok.com/marketing_api/api/developer/app) */
  authBaseUrl?: string;
  /** Maximum requests per second (default: 50) */
  maxQps?: number;
  /** Maximum retry attempts for transient errors (default: 3) */
  maxRetries?: number;
  /** Initial backoff delay in ms (default: 1000) */
  baseDelayMs?: number;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Optional callback invoked whenever tokens are refreshed */
  onTokenRefresh?: (tokens: TikTokTokens) => void | Promise<void>;
}

export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // Epoch ms
  refreshExpiresAt: number; // Epoch ms
  scope: string[];
}

// ─────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────

export class TikTokApiError extends Error {
  public readonly code: number;
  public readonly requestId: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(opts: {
    message: string;
    code: number;
    requestId: string;
    statusCode?: number;
    isRetryable?: boolean;
  }) {
    super(`[TikTok ${opts.code}] ${opts.message} (req: ${opts.requestId})`);
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.statusCode = opts.statusCode;
    this.isRetryable = opts.isRetryable ?? false;
  }
}

export class TikTokRateLimitError extends TikTokApiError {
  public readonly retryAfterMs: number;

  constructor(opts: {
    message: string;
    code: number;
    requestId: string;
    retryAfterMs: number;
  }) {
    super({ ...opts, isRetryable: true });
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class TikTokAuthError extends TikTokApiError {
  constructor(opts: { message: string; code: number; requestId: string }) {
    super({ ...opts, isRetryable: false });
  }
}

// ─────────────────────────────────────────────
// Rate Limiter State
// ─────────────────────────────────────────────

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per ms
}
