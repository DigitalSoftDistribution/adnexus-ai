/**
 * Google Ads API - TypeScript Type Definitions
 * AdNexus AI Platform
 *
 * Comprehensive type definitions for Google Ads API v15+ entities,
 * operations, requests, and responses.
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  id_token?: string;
  scope?: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface GoogleAdsApiConfig {
  developerToken: string;
  loginCustomerId?: string;
  linkedCustomerId?: string;
  apiVersion?: string;
  baseUrl?: string;
}

export interface GoogleAdsClientConfig {
  auth: GoogleOAuthConfig;
  api: GoogleAdsApiConfig;
  customerId: string;
}

export interface AuthUrlOptions {
  state?: string;
  accessType?: "online" | "offline";
  prompt?: "none" | "consent" | "select_account";
  includeGrantedScopes?: boolean;
  loginHint?: string;
}

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export type CampaignStatus = "ENABLED" | "PAUSED" | "REMOVED";
export type CampaignServingStatus =
  | "SERVING"
  | "NONE"
  | "ENDED"
  | "PENDING"
  | "SUSPENDED";

export type AdGroupStatus = "ENABLED" | "PAUSED" | "REMOVED";
export type AdGroupAdStatus = "ENABLED" | "PAUSED" | "REMOVED";

export type AdvertisingChannelType =
  | "SEARCH"
  | "DISPLAY"
  | "SHOPPING"
  | "HOTEL"
  | "VIDEO"
  | "MULTI_CHANNEL"
  | "LOCAL"
  | "SMART"
  | "PERFORMANCE_MAX"
  | "LOCAL_SERVICES"
  | "TRAVEL"
  | "DEMAND_GEN";

export type AdvertisingChannelSubType =
  | "SEARCH_MOBILE_APP"
  | "DISPLAY_MOBILE_APP"
  | "SEARCH_EXPRESS"
  | "DISPLAY_EXPRESS"
  | "DISPLAY_SMART_CAMPAIGN"
  | "SMART_CAMPAIGN"
  | "SHOPPING_SMART_ADS"
  | "GMAIL_AD"
  | "DISPLAY_GMAIL_AD"
  | "DISPLAY_ENGAGEMENT"
  | "VIDEO_ACTION"
  | "VIDEO_NON_SKIPPABLE"
  | "VIDEO_OUTSTREAM"
  | "VIDEO_SEQUENCE"
  | "VIDEO_REACH_TARGET_FREQUENCY"
  | "APP_CAMPAIGN"
  | "APP_CAMPAIGN_FOR_ENGAGEMENT"
  | "APP_CAMPAIGN_FOR_PRE_REGISTRATION"
  | "SHOPPING_COMPARISON_LISTING_ADS"
  | "TRAVEL_ACTIVITIES"
  | "DEMAND_GEN"
  | "UNSPECIFIED";

export type BiddingStrategyType =
  | "MANUAL_CPC"
  | "MANUAL_CPM"
  | "MANUAL_CPV"
  | "MAXIMIZE_CONVERSIONS"
  | "MAXIMIZE_CONVERSION_VALUE"
  | "TARGET_CPA"
  | "TARGET_ROAS"
  | "TARGET_IMPRESSION_SHARE"
  | "PERCENT_CPC"
  | "TARGET_CPM"
  | "TARGET_OUTRANK_SHARE"
  | "PAGE_ONE_PROMOTED"
  | "ENHANCED_CPC"
  | "MAXIMIZE_CLICKS"
  | "COMMISSION"
  | "MANUAL_CPA"
  | "NONE";

export type AdType =
  | "RESPONSIVE_SEARCH_AD"
  | "APP_AD"
  | "CALL_AD"
  | "DISPLAY_UPLOAD_AD"
  | "EXPANDED_DYNAMIC_SEARCH_AD"
  | "EXPANDED_TEXT_AD"
  | "HOTEL_AD"
  | "IMAGE_AD"
  | "LEGACY_RESPONSIVE_DISPLAY_AD"
  | "LOCAL_AD"
  | "RESPONSIVE_DISPLAY_AD"
  | "SHOPPING_COMPARISON_LISTING_AD"
  | "SHOPPING_PRODUCT_AD"
  | "SHOPPING_SMART_AD"
  | "SMART_CAMPAIGN_AD"
  | "TEXT_AD"
  | "VIDEO_AD"
  | "VIDEO_BUMPER_AD"
  | "VIDEO_NON_SKIPPABLE_IN_STREAM_AD"
  | "VIDEO_OUTSTREAM_AD"
  | "VIDEO_RESPONSIVE_AD"
  | "VIDEO_TRUEVIEW_IN_STREAM_AD"
  | "VIDEO_TRUEVIEW_IN_DISPLAY_AD"
  | "RESPONSIVE_SEARCH_AD_ENHANCED";

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export interface CampaignBudget {
  resourceName: string;
  id: string;
  amountMicros: string;
  deliveryMethod: "STANDARD" | "ACCELERATED";
  explicitlyShared: boolean;
  status: CampaignStatus;
}

export interface CampaignNetworkSettings {
  targetGoogleSearch: boolean;
  targetSearchNetwork: boolean;
  targetContentNetwork: boolean;
  targetPartnerSearchNetwork: boolean;
}

export interface CampaignBiddingStrategy {
  manualCpc?: { enhancedCpcEnabled: boolean };
  maximizeConversions?: { targetCpaMicros?: string; cpcBidCeilingMicros?: string };
  maximizeConversionValue?: { targetRoas?: number; cpcBidCeilingMicros?: string };
  targetCpa?: { targetCpaMicros: string; cpcBidCeilingMicros?: string };
  targetRoas?: { targetRoas: number; cpcBidCeilingMicros?: string };
  targetImpressionShare?: {
    location: "ANYWHERE_ON_PAGE" | "TOP_OF_PAGE" | "ABSOLUTE_TOP_OF_PAGE";
    locationFractionMicros?: string;
    cpcBidCeilingMicros: string;
  };
  percentCpc?: { cpcBidCeilingMicros?: string; enhancedCpcEnabled: boolean };
  maximizeClicks?: { cpcBidCeilingMicros?: string; targetSpendMicros?: string };
}

export interface Campaign {
  resourceName: string;
  id: string;
  name: string;
  status: CampaignStatus;
  servingStatus: CampaignServingStatus;
  advertisingChannelType: AdvertisingChannelType;
  advertisingChannelSubType?: AdvertisingChannelSubType;
  startDate: string;
  endDate?: string;
  campaignBudget: string;
  biddingStrategyType: BiddingStrategyType;
  biddingStrategy?: CampaignBiddingStrategy;
  networkSettings: CampaignNetworkSettings;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  urlCustomParameters?: Array<{ key: string; value: string }>;
  labels?: string[];
  experimentType?: string;
  baseCampaign?: string;
  frequencyCaps?: Array<{
    level: "AD_GROUP_AD" | "AD_GROUP" | "CAMPAIGN" | "UNKNOWN";
    eventType: "IMPRESSION" | "VIDEO" | "INTERACTION" | "UNKNOWN";
    timeUnit: "DAY" | "WEEK" | "MONTH" | "UNKNOWN";
    timeCount: number;
  }>;
  geoTargetTypeSetting?: {
    positiveGeoTargetType: string;
    negativeGeoTargetType: string;
  };
  selectiveOptimization?: { conversionActions: string[] };
  optimizationScore?: number;
  paymentMode?: string;
}

export interface CreateCampaignData {
  name: string;
  status?: CampaignStatus;
  advertisingChannelType: AdvertisingChannelType;
  advertisingChannelSubType?: AdvertisingChannelSubType;
  campaignBudget?: string;
  budgetAmountMicros?: string;
  startDate?: string;
  endDate?: string;
  biddingStrategyType?: BiddingStrategyType;
  biddingStrategy?: CampaignBiddingStrategy;
  networkSettings?: Partial<CampaignNetworkSettings>;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
}

export interface UpdateCampaignData {
  name?: string;
  status?: CampaignStatus;
  campaignBudget?: string;
  budgetAmountMicros?: string;
  startDate?: string;
  endDate?: string;
  biddingStrategy?: CampaignBiddingStrategy;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
}

export interface CampaignListParams {
  limit?: number;
  offset?: number;
  statuses?: CampaignStatus[];
  channelTypes?: AdvertisingChannelType[];
  search?: string;
  dateRange?: DateRange;
  orderBy?: string;
}

// ============================================================================
// AD GROUP TYPES
// ============================================================================

export interface AdGroup {
  resourceName: string;
  id: string;
  name: string;
  status: AdGroupStatus;
  type: string;
  adRotationMode?: string;
  baseAdGroup?: string;
  campaign: string;
  cpcBidMicros?: string;
  cpmBidMicros?: string;
  cpvBidMicros?: string;
  targetCpaMicros?: string;
  targetCpmMicros?: string;
  targetRoas?: number;
  percentCpcBidMicros?: string;
  effectiveTargetCpaMicros?: string;
  effectiveTargetCpaSource?: string;
  effectiveTargetRoas?: number;
  effectiveTargetRoasSource?: string;
  labels?: string[];
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  excludedParentAssetFieldTypes?: string[];
  urlCustomParameters?: Array<{ key: string; value: string }>;
  displayCustomBidDimension?: string;
}

export interface CreateAdGroupData {
  campaignId: string;
  name: string;
  status?: AdGroupStatus;
  cpcBidMicros?: string;
  cpmBidMicros?: string;
  cpvBidMicros?: string;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
}

export interface UpdateAdGroupData {
  name?: string;
  status?: AdGroupStatus;
  cpcBidMicros?: string;
  cpmBidMicros?: string;
  trackingUrlTemplate?: string;
}

// ============================================================================
// AD TYPES
// ============================================================================

export interface ResponsiveSearchAdAsset {
  text: string;
  pinnedField?: "HEADLINE_1" | "HEADLINE_2" | "HEADLINE_3" | "DESCRIPTION_1" | "DESCRIPTION_2" | "UNSPECIFIED";
}

export interface ResponsiveSearchAd {
  headlines: ResponsiveSearchAdAsset[];
  descriptions: ResponsiveSearchAdAsset[];
  path1?: string;
  path2?: string;
  adStrength?: string;
}

export interface ResponsiveDisplayAd {
  marketingImages: Array<{ asset: string }>;
  squareMarketingImages?: Array<{ asset: string }>;
  headlines: Array<{ text: string }>;
  longHeadline?: { text: string };
  descriptions: Array<{ text: string }>;
  businessName: string;
  finalUrls?: string[];
  callToActionText?: string;
  mainColor?: string;
  accentColor?: string;
  allowFlexibleColor?: boolean;
  formatSetting?: string;
  logoImages?: Array<{ asset: string }>;
  squareLogoImages?: Array<{ asset: string }>;
  youtubeVideos?: Array<{ asset: string }>;
}

export interface ExpandedTextAd {
  headlinePart1: string;
  headlinePart2: string;
  headlinePart3?: string;
  description1: string;
  description2?: string;
  path1?: string;
  path2?: string;
}

export interface AdData {
  resourceName?: string;
  id?: string;
  type: AdType;
  finalUrls?: string[];
  finalMobileUrls?: string[];
  finalAppUrls?: Array<{ osType: string; url: string }>;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  urlCustomParameters?: Array<{ key: string; value: string }>;
  responsiveSearchAd?: ResponsiveSearchAd;
  responsiveDisplayAd?: ResponsiveDisplayAd;
  expandedTextAd?: ExpandedTextAd;
  name?: string;
}

export interface AdGroupAd {
  resourceName: string;
  adGroup: string;
  ad: AdData;
  status: AdGroupAdStatus;
  policySummary?: {
    reviewStatus: string;
    approvalStatus: string;
    policyTopicEntries?: Array<{
      topic: string;
      type: string;
      evidences?: Array<{
        websiteList?: { websites: string[] };
        textList?: { texts: string[] };
        destinationTextList?: { destinationTexts: string[] };
        destinationMismatch?: { url: string };
      }>;
      constraints?: Array<{
        certificateMissing?: { countryCodes: string[] };
        certificateMismatch?: { countryCodes: string[] };
      }>;
    }>;
  };
  adStrength?: string;
}

export interface CreateAdData {
  adGroupId: string;
  type: AdType;
  status?: AdGroupAdStatus;
  finalUrls: string[];
  responsiveSearchAd?: Omit<ResponsiveSearchAd, "adStrength">;
  responsiveDisplayAd?: Omit<ResponsiveDisplayAd, "formatSetting">;
  expandedTextAd?: ExpandedTextAd;
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
}

// ============================================================================
// METRICS & INSIGHTS TYPES
// ============================================================================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CampaignMetrics {
  campaignResourceName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  viewThroughConversions: string;
  allConversions: string;
  allConversionsValue: string;
  ctr: number;
  averageCpc: number;
  averageCpm: number;
  costPerConversion: number;
  conversionRate: number;
  roas: number;
  absoluteTopImpressionPercentage: number;
  topImpressionPercentage: number;
  searchImpressionShare?: number;
  searchClickShare?: number;
  searchTopImpressionShare?: number;
  searchAbsoluteTopImpressionShare?: number;
  searchBudgetLostAbsoluteTopImpressionShare?: number;
  searchBudgetLostTopImpressionShare?: number;
  searchBudgetLostImpressionShare?: number;
  searchRankLostAbsoluteTopImpressionShare?: number;
  searchRankLostTopImpressionShare?: number;
  searchRankLostImpressionShare?: number;
  bounceRate?: number;
  averageCpe?: number;
  dateRange?: DateRange;
}

export interface AccountSummary {
  customerId: string;
  descriptiveName?: string;
  currencyCode?: string;
  dateRange: DateRange;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  viewThroughConversions: string;
  allConversions: string;
  ctr: number;
  averageCpc: number;
  averageCpm: number;
  costPerConversion: number;
  conversionRate: number;
  roas: number;
  campaignCount: number;
  adGroupCount: number;
}

export interface ConversionAction {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  type: string;
  category: string;
  ownerCustomer: string;
  includeInConversionsMetric: boolean;
  clickThroughLookbackWindowDays: number;
  viewThroughLookbackWindowDays: number;
  valueSettings?: {
    defaultValue: number;
    defaultCurrencyCode: string;
    alwaysUseDefaultValue: boolean;
  };
}

// ============================================================================
// GAQL TYPES
// ============================================================================

export interface GAQLSelectField {
  entity: string;
  fields: string[];
}

export interface GAQLQuery {
  select: string[];
  from: string;
  where?: GAQLCondition[];
  orderBy?: Array<{ field: string; direction?: "ASC" | "DESC" }>;
  limit?: number;
  parameters?: Array<{ key: string; value: string }>;
}

export interface GAQLCondition {
  field: string;
  operator:
    | "="
    | "!="
    | "<"
    | ">"
    | "<="
    | ">="
    | "IN"
    | "NOT IN"
    | "LIKE"
    | "NOT LIKE"
    | "CONTAINS NONE"
    | "CONTAINS ANY"
    | "CONTAINS ALL"
    | "IS NULL"
    | "IS NOT NULL"
    | "DURING"
    | "BETWEEN";
  value?: string | string[] | number | boolean;
  raw?: string;
}

export type GAQLResource =
  | "accessible_bidding_strategy"
  | "ad_group"
  | "ad_group_ad"
  | "ad_group_ad_asset_combination_view"
  | "ad_group_ad_asset_view"
  | "ad_group_ad_label"
  | "ad_group_asset"
  | "ad_group_bid_modifier"
  | "ad_group_criterion"
  | "ad_group_criterion_label"
  | "ad_group_label"
  | "ad_parameter"
  | "asset"
  | "asset_group"
  | "asset_group_asset"
  | "asset_group_listing_group_filter"
  | "asset_group_signal"
  | "asset_set"
  | "asset_set_asset"
  | "audience"
  | "batch_job"
  | "bidding_data_exclusion"
  | "bidding_seasonality_adjustment"
  | "billing_setup"
  | "campaign"
  | "campaign_asset"
  | "campaign_asset_set"
  | "campaign_bid_modifier"
  | "campaign_budget"
  | "campaign_conversion_goal"
  | "campaign_criterion"
  | "campaign_group"
  | "campaign_label"
  | "campaign_shared_set"
  | "conversion_action"
  | "conversion_custom_variable"
  | "conversion_goal_campaign_config"
  | "conversion_value_rule"
  | "conversion_value_rule_set"
  | "currency_constant"
  | "custom_conversion_goal"
  | "customer"
  | "customer_asset"
  | "customer_conversion_goal"
  | "customer_label"
  | "customer_manager_link"
  | "customer_negative_criterion"
  | "customer_user_access"
  | "customer_user_access_invitation"
  | "data_link"
  | "experiment"
  | "experiment_arm"
  | "extension_feed_item"
  | "feed"
  | "feed_item"
  | "feed_item_set"
  | "feed_item_set_link"
  | "feed_item_target"
  | "feed_mapping"
  | "geo_target_constant"
  | "keyword_plan"
  | "keyword_plan_ad_group"
  | "keyword_plan_ad_group_keyword"
  | "keyword_plan_campaign"
  | "keyword_plan_campaign_keyword"
  | "label"
  | "language_constant"
  | "mobile_app_category_constant"
  | "mobile_device_constant"
  | "offline_user_data_job"
  | "operating_system_version_constant"
  | "product_bidding_category_constant"
  | "product_link"
  | "product_link_invitation"
  | "recommendation"
  | "remarketing_action"
  | "shared_criterion"
  | "shared_set"
  | "smart_campaign_setting"
  | "third_party_app_analytics_link"
  | "travel_activity_group_view"
  | "travel_activity_performance_view"
  | "user_interest"
  | "user_list"
  | "user_location_view"
  | "video";

export type GAQLCampaignField =
  | "campaign.resource_name"
  | "campaign.id"
  | "campaign.name"
  | "campaign.status"
  | "campaign.serving_status"
  | "campaign.advertising_channel_type"
  | "campaign.advertising_channel_sub_type"
  | "campaign.start_date"
  | "campaign.end_date"
  | "campaign.campaign_budget"
  | "campaign.bidding_strategy_type"
  | "campaign.tracking_url_template"
  | "campaign.final_url_suffix"
  | "campaign.experiment_type"
  | "campaign.base_campaign"
  | "campaign.labels"
  | "campaign.optimization_score";

export type GAQLAdGroupField =
  | "ad_group.resource_name"
  | "ad_group.id"
  | "ad_group.name"
  | "ad_group.status"
  | "ad_group.type"
  | "ad_group.campaign"
  | "ad_group.cpc_bid_micros"
  | "ad_group.cpm_bid_micros"
  | "ad_group.cpv_bid_micros"
  | "ad_group.target_cpa_micros"
  | "ad_group.target_roas"
  | "ad_group.labels"
  | "ad_group.tracking_url_template";

export type GAQLAdField =
  | "ad_group_ad.resource_name"
  | "ad_group_ad.status"
  | "ad_group_ad.ad_strength"
  | "ad_group_ad.ad.resource_name"
  | "ad_group_ad.ad.id"
  | "ad_group_ad.ad.type"
  | "ad_group_ad.ad.responsive_search_ad.headlines"
  | "ad_group_ad.ad.responsive_search_ad.descriptions"
  | "ad_group_ad.ad.responsive_search_ad.path1"
  | "ad_group_ad.ad.responsive_search_ad.path2"
  | "ad_group_ad.ad.responsive_display_ad.headlines"
  | "ad_group_ad.ad.responsive_display_ad.descriptions"
  | "ad_group_ad.ad.final_urls"
  | "ad_group_ad.ad.final_mobile_urls"
  | "ad_group_ad.ad.tracking_url_template";

export type GAQLMetricsField =
  | "metrics.impressions"
  | "metrics.clicks"
  | "metrics.cost_micros"
  | "metrics.conversions"
  | "metrics.conversions_value"
  | "metrics.view_through_conversions"
  | "metrics.all_conversions"
  | "metrics.all_conversions_value"
  | "metrics.ctr"
  | "metrics.average_cpc"
  | "metrics.average_cpm"
  | "metrics.cost_per_conversion"
  | "metrics.conversions_from_interactions_rate"
  | "metrics.value_per_conversion"
  | "metrics.absolute_top_impression_percentage"
  | "metrics.top_impression_percentage"
  | "metrics.search_impression_share"
  | "metrics.search_click_share"
  | "metrics.search_top_impression_share"
  | "metrics.search_absolute_top_impression_share"
  | "metrics.search_budget_lost_absolute_top_impression_share"
  | "metrics.search_budget_lost_top_impression_share"
  | "metrics.search_budget_lost_impression_share"
  | "metrics.search_rank_lost_absolute_top_impression_share"
  | "metrics.search_rank_lost_top_impression_share"
  | "metrics.search_rank_lost_impression_share"
  | "metrics.bounce_rate"
  | "metrics.average_cpe";

export type GAQLSegmentsField =
  | "segments.date"
  | "segments.week"
  | "segments.month"
  | "segments.quarter"
  | "segments.year"
  | "segments.ad_network_type"
  | "segments.device"
  | "segments.conversion_action"
  | "segments.conversion_action_name"
  | "segments.conversion_action_category";

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface SearchGoogleAdsRequest {
  customerId: string;
  query: string;
  pageToken?: string;
  pageSize?: number;
  validateOnly?: boolean;
  returnTotalResultsCount?: boolean;
  summaryRowSetting?: "NO_SUMMARY_ROW" | "SUMMARY_ROW_WITH_RESULTS" | "SUMMARY_ROW_ONLY";
}

export interface SearchGoogleAdsRow {
  campaign?: Partial<Campaign>;
  adGroup?: Partial<AdGroup>;
  adGroupAd?: Partial<AdGroupAd>;
  metrics?: Partial<CampaignMetrics>;
  segments?: Record<string, string>;
  conversionAction?: Partial<ConversionAction>;
  customer?: Record<string, string>;
}

export interface SearchGoogleAdsResponse {
  results: SearchGoogleAdsRow[];
  nextPageToken?: string;
  totalResultsCount?: string;
  fieldMask?: string;
  summaryRow?: SearchGoogleAdsRow;
}

export interface MutateOperation {
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  remove?: string;
  updateMask?: { paths: string[] };
}

export interface MutateRequest {
  customerId: string;
  operations: MutateOperation[];
  partialFailure?: boolean;
  validateOnly?: boolean;
  responseContentType?: "MUTABLE_RESOURCE" | "RESOURCE_NAME_ONLY";
}

export interface MutateResponse {
  results: Array<{
    resourceName: string;
    campaign?: Partial<Campaign>;
    adGroup?: Partial<AdGroup>;
    adGroupAd?: Partial<AdGroupAd>;
  }>;
  partialFailureError?: {
    code: number;
    message: string;
    details: Array<{
      typeUrl: string;
      value: string;
    }>;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface GoogleAdsErrorDetail {
  errorCode: {
    requestError?: string;
    biddingStrategyError?: string;
    campaignError?: string;
    adGroupError?: string;
    adError?: string;
    adGroupAdError?: string;
    authenticationError?: string;
    authorizationError?: string;
    rateLimitError?: string;
    queryError?: string;
    [key: string]: string | undefined;
  };
  message: string;
  location?: {
    fieldPathElements?: Array<{ fieldName: string; index?: number }>;
  };
  trigger?: { stringValue?: string; int64Value?: string };
}

export interface GoogleAdsErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details: Array<{
      "@type": string;
      errors?: GoogleAdsErrorDetail[];
      requestId?: string;
    }>;
  };
}

export type GoogleAdsErrorCode =
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "QUERY_ERROR"
  | "REQUEST_ERROR"
  | "INTERNAL_ERROR"
  | "UNAVAILABLE"
  | "DEADLINE_EXCEEDED"
  | "PARTIAL_FAILURE";

export class GoogleAdsApiError extends Error {
  public readonly code: number;
  public readonly status: string;
  public readonly details: GoogleAdsErrorDetail[];
  public readonly requestId?: string;
  public readonly isRetryable: boolean;
  public readonly errorCode?: GoogleAdsErrorCode;

  constructor(
    message: string,
    code: number,
    status: string,
    details: GoogleAdsErrorDetail[] = [],
    requestId?: string
  ) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.isRetryable = GoogleAdsApiError.isRetryableError(code, status);
    this.errorCode = GoogleAdsApiError.classifyError(code, status, details);
  }

  private static isRetryableError(code: number, status: string): boolean {
    const retryableStatuses = [
      "UNAVAILABLE",
      "DEADLINE_EXCEEDED",
      "RESOURCE_EXHAUSTED",
      "ABORTED",
      "INTERNAL",
    ];
    const retryableCodes = [429, 500, 502, 503, 504];
    return (
      retryableStatuses.includes(status) || retryableCodes.includes(code)
    );
  }

  private static classifyError(
    code: number,
    status: string,
    details: GoogleAdsErrorDetail[]
  ): GoogleAdsErrorCode | undefined {
    if (code === 401) return "AUTHENTICATION_ERROR";
    if (code === 403) return "AUTHORIZATION_ERROR";
    if (code === 429) return "RATE_LIMIT_EXCEEDED";
    if (status === "UNAVAILABLE") return "UNAVAILABLE";
    if (status === "DEADLINE_EXCEEDED") return "DEADLINE_EXCEEDED";
    if (status === "INTERNAL") return "INTERNAL_ERROR";

    const firstError = details[0];
    if (firstError?.errorCode) {
      if (firstError.errorCode.rateLimitError) return "RATE_LIMIT_EXCEEDED";
      if (firstError.errorCode.authenticationError) return "AUTHENTICATION_ERROR";
      if (firstError.errorCode.authorizationError) return "AUTHORIZATION_ERROR";
      if (firstError.errorCode.queryError) return "QUERY_ERROR";
      if (firstError.errorCode.requestError) return "REQUEST_ERROR";
    }

    return undefined;
  }
}

// ============================================================================
// RATE LIMITER TYPES
// ============================================================================

export interface RateLimitConfig {
  maxOperationsPerDay: number;
  maxOperationsPerHour: number;
  maxOperationsPerMinute: number;
  maxConcurrentRequests: number;
  retryConfig: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

export interface RateLimitState {
  dailyOperationCount: number;
  hourlyOperationCount: number;
  minuteOperationCount: number;
  concurrentRequests: number;
  lastResetTime: {
    daily: number;
    hourly: number;
    minute: number;
  };
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount?: number;
    hasNextPage: boolean;
    nextPageToken?: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  pageToken?: string;
}
