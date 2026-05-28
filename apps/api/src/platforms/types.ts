/**
 * AdNexus AI - Unified Platform Types
 * Shared type definitions across all advertising platform integrations.
 *
 * Platforms: Meta, Google, TikTok, Snap
 */

// ──────────────────────────────────────────────
// Core Platform Types
// ──────────────────────────────────────────────

/** Supported advertising platforms */
export type Platform = 'meta' | 'google' | 'tiktok' | 'snap';

/** Campaign objective types (unified across platforms) */
export type CampaignObjective =
  | 'awareness'
  | 'traffic'
  | 'engagement'
  | 'app_installs'
  | 'video_views'
  | 'lead_generation'
  | 'conversions'
  | 'sales'
  | 'retargeting';

/** Budget allocation type */
export type BudgetType = 'daily' | 'lifetime';

/** Unified campaign status (normalized across all platforms) */
export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft' | 'archived';

/** Ad creative type (unified classification) */
export type CreativeType =
  | 'image'
  | 'video'
  | 'carousel'
  | 'collection'
  | 'story'
  | 'reel'
  | 'text'
  | 'responsive';

/** Call-to-action options (unified) */
export type CallToAction =
  | 'SHOP_NOW'
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'DOWNLOAD'
  | 'BOOK_TRAVEL'
  | 'APPLY_NOW'
  | 'CONTACT_US'
  | 'GET_QUOTE'
  | 'SUBSCRIBE'
  | 'WATCH_MORE'
  | 'GET_DIRECTIONS'
  | 'ORDER_NOW';

// ──────────────────────────────────────────────
// Unified Entity Interfaces
// ──────────────────────────────────────────────

/**
 * Unified Campaign — normalized representation of a campaign
 * across all advertising platforms.
 */
export interface UnifiedCampaign {
  id: string;
  platform: Platform;
  platformCampaignId: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  budgetType: BudgetType;
  budget: number;
  budgetCurrency: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  startDate: string;
  endDate?: string;
  targeting: UnifiedTargeting;
  createdAt: string;
  updatedAt: string;
  platformRaw?: Record<string, unknown>;
}

/**
 * Unified Ad — normalized representation of an ad / ad creative
 * across all advertising platforms.
 */
export interface UnifiedAd {
  id: string;
  campaignId: string;
  adGroupId?: string;
  platform: Platform;
  platformAdId: string;
  name: string;
  status: CampaignStatus;
  creativeType: CreativeType;
  headline: string;
  body: string;
  callToAction: CallToAction;
  landingPageUrl: string;
  creativeUrl?: string;
  thumbnailUrl?: string;
  videoDuration?: number;
  performance: AdPerformanceSnapshot;
  createdAt: string;
  updatedAt: string;
  platformRaw?: Record<string, unknown>;
}

/**
 * Unified Daily Insight — daily performance metrics normalized
 * across all advertising platforms.
 */
export interface UnifiedInsight {
  campaignId: string;
  adGroupId?: string;
  adId?: string;
  platform: Platform;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  reach?: number;
  frequency?: number;
  uniqueClicks?: number;
  videoViews?: number;
  videoView25?: number;
  videoView50?: number;
  videoView75?: number;
  videoView100?: number;
  engagementRate?: number;
  platformRaw?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Targeting Types
// ──────────────────────────────────────────────

/** Unified targeting configuration */
export interface UnifiedTargeting {
  ageRange?: { min: number; max: number };
  genders?: ('male' | 'female' | 'all')[];
  locations?: LocationTarget[];
  languages?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  excludedAudiences?: string[];
  placements?: PlacementTarget[];
  deviceTypes?: ('mobile' | 'desktop' | 'tablet')[];
  operatingSystems?: string[];
  platformSpecific?: Record<string, unknown>;
}

/** Location targeting entry */
export interface LocationTarget {
  id?: string;
  name: string;
  countryCode: string;
  region?: string;
  city?: string;
  radius?: number;
  radiusUnit?: 'km' | 'mile';
}

/** Placement targeting entry */
export interface PlacementTarget {
  platform: string;
  position: string;
  enabled: boolean;
}

// ──────────────────────────────────────────────
// Performance Types
// ──────────────────────────────────────────────

/** Ad performance snapshot (used in UnifiedAd) */
export interface AdPerformanceSnapshot {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  conversions?: number;
  cpa?: number;
}

/** Account-level summary metrics */
export interface AccountSummary {
  workspaceId: string;
  dateRange: DateRange;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
    reach?: number;
  };
  byPlatform: PlatformBreakdown[];
  byCampaign: CampaignBreakdown[];
  byDay: DailyBreakdown[];
}

/** Platform-level breakdown in account summary */
export interface PlatformBreakdown {
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  roas: number;
  budget: number;
}

/** Campaign-level breakdown in account summary */
export interface CampaignBreakdown {
  campaignId: string;
  campaignName: string;
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

/** Daily-level breakdown */
export interface DailyBreakdown {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
}

// ──────────────────────────────────────────────
// Cross-Platform Insight Types
// ──────────────────────────────────────────────

/** Cross-platform comparison insights */
export interface CrossPlatformInsights {
  workspaceId: string;
  dateRange: DateRange;
  consolidated: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
    roas: number;
  };
  platformComparison: PlatformComparison[];
  topPerformers: TopPerformer[];
  trends: TrendEntry[];
}

/** Per-platform comparison entry */
export interface PlatformComparison {
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  reach?: number;
  budgetUtilization: number;
}

/** Top-performing campaign entry */
export interface TopPerformer {
  campaignId: string;
  campaignName: string;
  platform: Platform;
  roas: number;
  spend: number;
  conversions: number;
  rank: number;
}

/** Trend entry for time-series data */
export interface TrendEntry {
  date: string;
  platform: Platform;
  spend: number;
  conversions: number;
  roas: number;
}

// ──────────────────────────────────────────────
// Input / Operation Types
// ──────────────────────────────────────────────

/** Date range for insights queries */
export interface DateRange {
  start: string;
  end: string;
  timezone?: string;
}

/** Campaign filters for list operations */
export interface CampaignFilters {
  status?: CampaignStatus[];
  objective?: CampaignObjective[];
  platform?: Platform[];
  dateRange?: DateRange;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'spend' | 'roas' | 'conversions' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/** Input for creating a new campaign */
export interface CreateCampaignInput {
  platform: Platform;
  name: string;
  objective: CampaignObjective;
  budgetType: BudgetType;
  budget: number;
  budgetCurrency?: string;
  startDate: string;
  endDate?: string;
  targeting: UnifiedTargeting;
  status?: CampaignStatus;
  accountId: string;
  platformSpecific?: Record<string, unknown>;
}

/** Input for updating an existing campaign */
export interface UpdateCampaignInput {
  name?: string;
  status?: CampaignStatus;
  budgetType?: BudgetType;
  budget?: number;
  startDate?: string;
  endDate?: string;
  targeting?: Partial<UnifiedTargeting>;
  platformSpecific?: Record<string, unknown>;
}

/** Input for creating a new ad */
export interface CreateAdInput {
  campaignId: string;
  adGroupId?: string;
  platform: Platform;
  name: string;
  creativeType: CreativeType;
  headline: string;
  body: string;
  callToAction: CallToAction;
  landingPageUrl: string;
  creativeUrl?: string;
  videoDuration?: number;
  status?: CampaignStatus;
  targeting?: Partial<UnifiedTargeting>;
  platformSpecific?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Account & Authentication Types
// ──────────────────────────────────────────────

/** Stored advertising account record */
export interface AdAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  platformAccountId: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'active' | 'disconnected' | 'expired' | 'error';
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** OAuth connection request payload */
export interface OAuthConnectionRequest {
  workspaceId: string;
  platform: Platform;
  code: string;
  redirectUri: string;
  state?: string;
}

/** Token refresh result */
export interface TokenRefreshResult {
  accountId: string;
  platform: Platform;
  accessToken: string;
  expiresAt: string;
  refreshed: boolean;
}

// ──────────────────────────────────────────────
// Draft / Batch Operation Types
// ──────────────────────────────────────────────

/** A draft action to be executed across platforms */
export interface Draft {
  id: string;
  workspaceId: string;
  name: string;
  actions: DraftAction[];
  scheduledAt?: string;
}

/** Individual action within a draft */
export interface DraftAction {
  id: string;
  type: DraftActionType;
  platform: Platform;
  accountId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  result?: DraftActionResult;
  dependsOn?: string[];
  createdAt: string;
}

/** Draft action types */
export type DraftActionType =
  | 'create_campaign'
  | 'update_campaign'
  | 'pause_campaign'
  | 'resume_campaign'
  | 'create_ad'
  | 'update_ad'
  | 'pause_ad'
  | 'duplicate_ad'
  | 'update_targeting'
  | 'update_budget';

/** Result of a single draft action execution */
export interface DraftActionResult {
  success: boolean;
  platformObjectId?: string;
  error?: string;
  errorCode?: string;
  retryable: boolean;
  executedAt: string;
  platformRaw?: Record<string, unknown>;
}

/** Overall result of executing a draft */
export interface DraftResult {
  draftId: string;
  status: 'completed' | 'partial' | 'failed';
  actions: DraftAction[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    rolledBack: number;
  };
  startedAt: string;
  completedAt: string;
}

// ──────────────────────────────────────────────
// Configuration Types
// ──────────────────────────────────────────────

/** Platform configuration for a single platform */
export interface PlatformConfigEntry {
  platform: Platform;
  apiBaseUrl: string;
  apiVersion: string;
  authBaseUrl: string;
  authTokenUrl: string;
  rateLimit: RateLimitConfig;
  retryPolicy: RetryPolicyConfig;
  timeoutMs: number;
  scopes: string[];
  features: PlatformFeature[];
}

/** Supported platform features */
export type PlatformFeature =
  | 'campaign_management'
  | 'ad_management'
  | 'audience_targeting'
  | 'budget_automation'
  | 'advanced_reporting'
  | 'video_ads'
  | 'lead_gen_ads'
  | 'dynamic_creative'
  | 'a_b_testing'
  | 'offline_conversions';

/** Rate limiting configuration */
export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  retryAfterHeader?: string;
}

/** Retry policy configuration */
export interface RetryPolicyConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableStatusCodes: number[];
}

/** Complete platform configuration for PlatformManager */
export interface PlatformConfig {
  meta: PlatformConfigEntry;
  google: PlatformConfigEntry;
  tiktok: PlatformConfigEntry;
  snap: PlatformConfigEntry;
  defaults: {
    currency: string;
    timezone: string;
    dateFormat: string;
  };
}

// ──────────────────────────────────────────────
// Platform Client Interface
// ──────────────────────────────────────────────

/**
 * Abstract interface that every platform-specific client must implement.
 * This is the contract the PlatformManager uses to delegate operations.
 */
export interface PlatformClient {
  readonly platform: Platform;
  readonly account: AdAccount;

  // Campaign operations
  getCampaigns(filters?: CampaignFilters): Promise<UnifiedCampaign[]>;
  getCampaign(campaignId: string): Promise<UnifiedCampaign>;
  createCampaign(data: CreateCampaignInput): Promise<UnifiedCampaign>;
  updateCampaign(campaignId: string, data: UpdateCampaignInput): Promise<UnifiedCampaign>;
  pauseCampaign(campaignId: string): Promise<UnifiedCampaign>;
  resumeCampaign(campaignId: string): Promise<UnifiedCampaign>;

  // Ad operations
  getAds(campaignId: string): Promise<UnifiedAd[]>;
  createAd(data: CreateAdInput): Promise<UnifiedAd>;
  updateAd(adId: string, data: Partial<CreateAdInput>): Promise<UnifiedAd>;

  // Insights / reporting
  getInsights(campaignId: string, dateRange: DateRange): Promise<UnifiedInsight[]>;
  getAccountSummary(dateRange: DateRange): Promise<AccountSummary>;

  // Authentication
  refreshToken(): Promise<TokenRefreshResult>;
  validateToken(): Promise<boolean>;

  // Utility
  testConnection(): Promise<boolean>;
  getRateLimitStatus(): Promise<RateLimitStatus>;
}

/** Current rate limit status */
export interface RateLimitStatus {
  platform: Platform;
  remaining: number;
  limit: number;
  resetAt: string;
  retryAfterMs?: number;
}
