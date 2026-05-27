/**
 * @fileoverview Meta Marketing API Type Definitions
 * @module platforms/meta/types
 *
 * Comprehensive TypeScript interfaces for the Meta Marketing API.
 * Covers Campaigns, AdSets, Ads, Insights, Audiences, and supporting types.
 *
 * @version 1.0.0
 * @author AdNexus AI Engineering
 */

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

/** Supported campaign objectives in Meta Marketing API */
export type MetaCampaignObjective =
  | "APP_INSTALLS"
  | "BRAND_AWARENESS"
  | "CONVERSIONS"
  | "EVENT_RESPONSES"
  | "LEAD_GENERATION"
  | "LINK_CLICKS"
  | "LOCAL_AWARENESS"
  | "MESSAGES"
  | "OFFER_CLAIMS"
  | "OUTCOME_APP_PROMOTION"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "PAGE_LIKES"
  | "POST_ENGAGEMENT"
  | "PRODUCT_CATALOG_SALES"
  | "REACH"
  | "STORE_VISITS"
  | "VIDEO_VIEWS";

/** Campaign status values */
export type MetaCampaignStatus =
  | "ACTIVE"
  | "ARCHIVED"
  | "DELETED"
  | "PAUSED";

/** Campaign special ad categories (for regulated industries) */
export type MetaSpecialAdCategory =
  | "CREDIT"
  | "EMPLOYMENT"
  | "HOUSING"
  | "ISSUES_ELECTIONS_POLITICS"
  | "NONE"
  | "ONLINE_GAMBLING_AND_GAMING";

/** Campaign buying type */
export type MetaBuyingType = "AUCTION" | "RESERVED";

/** Campaign bid strategy */
export type MetaBidStrategy =
  | "COST_CAP"
  | "LOWEST_COST_WITHOUT_CAP"
  | "LOWEST_COST_WITH_BID_CAP"
  | "LOWEST_COST_WITH_MIN_ROAS"
  | "META_BID"
  | "TARGET_COST";

/**
 * Represents a Meta Ad Campaign
 * @see https://developers.facebook.com/docs/marketing-api/reference/campaign
 */
export interface MetaCampaign {
  /** Campaign ID */
  id: string;
  /** Campaign name */
  name: string;
  /** Account ID this campaign belongs to */
  account_id: string;
  /** Buying type: AUCTION or RESERVED */
  buying_type: MetaBuyingType;
  /** Campaign objective */
  objective: MetaCampaignObjective;
  /** Current status */
  status: MetaCampaignStatus;
  /** Whether campaign is configured for NextGen Dynamic Ads */
  is_dynamic_creative?: boolean;
  /** Whether the campaign has a heuristics budget */
  budget_rebalance_flag?: boolean;
  /** Whether budget has been saved */
  budget_save_status?: "NOT_IN_EFFECT" | "IN_EFFECT" | "PENDING";
  /** Whether the campaign can set the spend cap */
  can_set_spend_cap?: boolean;
  /** Whether the campaign can use the spend cap */
  can_use_spend_cap?: boolean;
  /** Configured status (may differ from effective status) */
  configured_status: MetaCampaignStatus;
  /** When the campaign was created */
  created_time: string;
  /** Daily budget in account currency (smallest unit) */
  daily_budget?: string;
  /** Effective status considering all factors */
  effective_status: string;
  /** Issues preventing campaign delivery */
  issues_info?: Array<{
    error_code: number;
    error_message: string;
    error_summary: string;
    level: string;
  }>;
  /** Lifetime budget in account currency (smallest unit) */
  lifetime_budget?: string;
  /** Special ad categories for regulated industries */
  special_ad_categories: MetaSpecialAdCategory[];
  /** Whether to boost Instagram feed posts for Stories placement */
  source_campaign_id?: string;
  /** Spend cap for the campaign */
  spend_cap?: string;
  /** Bid strategy */
  bid_strategy?: MetaBidStrategy;
  /** When the campaign was last updated */
  updated_time: string;
}

/** Parameters for listing campaigns */
export interface GetCampaignsParams {
  /** Fields to retrieve */
  fields?: string[];
  /** Filter campaigns by status */
  status?: MetaCampaignStatus[];
  /** Limit number of results */
  limit?: number;
  /** Cursor for pagination (after) */
  after?: string;
  /** Cursor for pagination (before) */
  before?: string;
  /** Filter by effective status */
  effective_status?: string[];
  /** Filter by objective */
  objective?: MetaCampaignObjective[];
  /** Filter by date prefix (YYYY-MM) */
  date_preset?: string;
  /** Sort order */
  sort?: string;
}

/** Data required to create a campaign */
export interface CreateCampaignData {
  /** Campaign name (required, max 394 characters) */
  name: string;
  /** Campaign objective */
  objective: MetaCampaignObjective;
  /** Status */
  status: MetaCampaignStatus;
  /** Special ad categories */
  special_ad_categories?: MetaSpecialAdCategory[];
  /** Buying type */
  buying_type?: MetaBuyingType;
  /** Daily budget in account currency cents */
  daily_budget?: number;
  /** Lifetime budget in account currency cents */
  lifetime_budget?: number;
  /** Bid strategy */
  bid_strategy?: MetaBidStrategy;
  /** Spend cap */
  spend_cap?: number;
  /** Ad set budget optimization */
  is_skadnetwork_attribution?: boolean;
}

/** Data for updating a campaign */
export type UpdateCampaignData = Partial<
  Omit<CreateCampaignData, "objective">
>;

// ============================================================================
// ADSET TYPES
// ============================================================================

/** AdSet billing event */
export type MetaBillingEvent =
  | "APP_INSTALLS"
  | "CLICKS"
  | "IMPRESSIONS"
  | "LINK_CLICKS"
  | "NONE"
  | "OFFER_CLAIMS"
  | "PAGE_LIKES"
  | "POST_ENGAGEMENT"
  | "THRUPLAY"
  | "PURCHASE"
  | "LISTING_INTERACTION";

/** AdSet optimization goal */
export type MetaOptimizationGoal =
  | "AD_RECALL_LIFT"
  | "APP_INSTALLS"
  | "APP_USES"
  | "BRAND_AWARENESS"
  | "CLICKS"
  | "DERIVED_EVENTS"
  | "ENGAGED_USERS"
  | "EVENT_RESPONSES"
  | "IMPRESSIONS"
  | "IN_APP_VALUE"
  | "LANDING_PAGE_VIEWS"
  | "LEAD_GENERATION"
  | "LINK_CLICKS"
  | "MESSAGING_APPOINTMENT_CONVERSION"
  | "MESSAGING_CONVERSATION_STARTED"
  | "MESSAGING_PURCHASE_CONVERSION"
  | "NONE"
  | "OFFER_CLAIMS"
  | "OUTCOME_APP_PROMOTION"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "PAGE_ENGAGEMENT"
  | "PAGE_LIKES"
  | "POST_ENGAGEMENT"
  | "QUALITY_CALL"
  | "QUALITY_LEAD"
  | "REACH"
  | "REMINDERS_SET"
  | "SUBSCRIBERS"
  | "THRUPLAY"
  | "VALUE"
  | "VISIT_INSTAGRAM_PROFILE"
  | "VISIT_STORE_PAGES";

/** AdSet targeting location type */
export interface MetaTargetingLocation {
  countries?: string[];
  regions?: Array<{ key: string; name?: string }>;
  cities?: Array<{ key: string; radius?: number; distance_unit?: "kilometer" | "mile" }>;
  zips?: Array<{ key: string; primary_city_id?: number; region_id?: number }>;
  custom_locations?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    distance_unit?: "kilometer" | "mile";
    name?: string;
    address_string?: string;
  }>;
  geo_markets?: Array<{ key: string; name?: string }>;
  location_types?: Array<
    "home" | "recent" | "travel_in"
  >;
}

/** AdSet targeting demographics */
export interface MetaTargetingDemographics {
  genders?: number[]; // 1=Male, 2=Female
  age_min?: number;
  age_max?: number;
}

/** AdSet targeting interests */
export interface MetaInterest {
  id: string;
  name: string;
}

/** AdSet targeting behavior */
export interface MetaBehavior {
  id: string;
  name: string;
}

/** AdSet targeting custom audience */
export interface MetaCustomAudienceTargeting {
  id: string;
  name?: string;
}

/** Full targeting specification for AdSets */
export interface MetaTargeting {
  geo_locations?: MetaTargetingLocation;
  excluded_geo_locations?: MetaTargetingLocation;
  demographics?: MetaTargetingDemographics;
  interests?: MetaInterest[];
  behaviors?: MetaBehavior[];
  custom_audiences?: MetaCustomAudienceTargeting[];
  excluded_custom_audiences?: MetaCustomAudienceTargeting[];
  flexible_spec?: Array<Record<string, unknown>>;
  exclusions?: Record<string, unknown>;
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  messenger_positions?: string[];
  audience_network_positions?: string[];
  device_platforms?: string[];
  user_os?: string[];
  user_device?: string[];
  wireless_carrier?: string[];
  education_statuses?: number[];
  relationship_statuses?: number[];
  life_events?: MetaInterest[];
  industries?: MetaInterest[];
  work_positions?: MetaInterest[];
  work_employers?: MetaInterest[];
  [key: string]: unknown;
}

/** AdSet status */
export type MetaAdSetStatus = "ACTIVE" | "ARCHIVED" | "DELETED" | "PAUSED" | "CAMPAIGN_PAUSED";

/**
 * Represents a Meta Ad Set
 * @see https://developers.facebook.com/docs/marketing-api/reference/adset
 */
export interface MetaAdSet {
  id: string;
  name: string;
  account_id: string;
  campaign_id: string;
  status: MetaAdSetStatus;
  configured_status: MetaAdSetStatus;
  effective_status: string;
  billing_event: MetaBillingEvent;
  optimization_goal: MetaOptimizationGoal;
  targeting: MetaTargeting;
  bid_amount?: number;
  bid_strategy?: MetaBidStrategy;
  budget_remaining?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  promoted_object?: {
    application_id?: string;
    object_store_url?: string;
    page_id?: string;
    pixel_id?: string;
    product_set_id?: string;
    custom_event_type?: string;
    [key: string]: unknown;
  };
  attribution_spec?: Array<{
    event_type: string;
    window_days: number;
  }>;
  start_time: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
  is_dynamic_creative?: boolean;
  pacing_type?: string[];
  destination_type?: string;
  frequency_control_specs?: Array<{
    event: string;
    interval_days: number;
    max_frequency: number;
  }>;
}

/** Parameters for listing ad sets */
export interface GetAdSetsParams {
  fields?: string[];
  status?: MetaAdSetStatus[];
  limit?: number;
  after?: string;
  before?: string;
  campaign_id?: string;
}

// ============================================================================
// AD & CREATIVE TYPES
// ============================================================================

/** Ad status */
export type MetaAdStatus = "ACTIVE" | "ARCHIVED" | "DELETED" | "PAUSED" | "PENDING_REVIEW" | "DISAPPROVED" | "PREAPPROVED" | "PENDING_BILLING_INFO" | "CAMPAIGN_PAUSED" | "ADSET_PAUSED" | "WITH_ISSUES";

/** Creative asset type */
export type MetaCreativeType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL"
  | "COLLECTION"
  | "DPA"
  | "SINGLE_IMAGE"
  | "SINGLE_VIDEO";

/** Creative object specification */
export interface MetaCreativeObjectStorySpec {
  page_id?: string;
  instagram_actor_id?: string;
  link_data?: {
    link: string;
    message?: string;
    name?: string;
    caption?: string;
    description?: string;
    picture?: string;
    call_to_action?: { type: string; value?: Record<string, string> };
    attachment_style?: string;
    child_attachments?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  photo_data?: {
    images?: Record<string, { url: string; width: number; height: number }>;
    caption?: string;
    url?: string;
    [key: string]: unknown;
  };
  video_data?: {
    video_id: string;
    title?: string;
    message?: string;
    call_to_action?: { type: string; value?: Record<string, string> };
    image_url?: string;
    [key: string]: unknown;
  };
  template_data?: Record<string, unknown>;
}

/** Asset specification for ad creatives */
export interface MetaAssetSpec {
  id?: string;
  hash?: string;
  url?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  type: MetaCreativeType;
  name?: string;
  width?: number;
  height?: number;
  file_size?: number;
  duration?: number;
  thumbnail_url?: string;
}

/**
 * Represents a Meta Ad Creative
 * @see https://developers.facebook.com/docs/marketing-api/reference/adcreative
 */
export interface MetaAdCreative {
  id: string;
  name: string;
  account_id: string;
  object_story_spec?: MetaCreativeObjectStorySpec;
  asset_feed_spec?: unknown;
  asset_spec?: MetaAssetSpec;
  thumbnail_url?: string;
  asset_customization_rules?: unknown[];
  asset_specifications?: MetaAssetSpec[];
  body?: string;
  call_to_action_type?: string;
  image_hash?: string;
  image_url?: string;
  link_url?: string;
  object_type?: string;
  status?: string;
  title?: string;
  video_id?: string;
  url_tags?: string;
}

/**
 * Represents a Meta Ad
 * @see https://developers.facebook.com/docs/marketing-api/reference/adgroup
 */
export interface MetaAd {
  id: string;
  name: string;
  account_id: string;
  adset_id: string;
  campaign_id: string;
  status: MetaAdStatus;
  configured_status: MetaAdStatus;
  effective_status: string;
  creative?: MetaAdCreative | { id: string };
  creative_id?: string;
  tracking_specs?: Array<Record<string, unknown>>;
  conversion_specs?: Array<Record<string, unknown>>;
  bid_amount?: number;
  created_time: string;
  updated_time: string;
  issues_info?: Array<{
    error_code: number;
    error_message: string;
    error_summary: string;
    level: string;
  }>;
  preview_shareable_link?: string;
  source_ad_id?: string;
  approval_status?: string;
  adlabels?: Array<{ id: string; name: string }>;
}

/** Parameters for listing ads */
export interface GetAdsParams {
  fields?: string[];
  status?: MetaAdStatus[];
  limit?: number;
  after?: string;
  before?: string;
  campaign_id?: string;
  adset_id?: string;
}

/** Data for creating an ad */
export interface CreateAdData {
  name: string;
  adset_id: string;
  status: MetaAdStatus;
  creative: { id: string } | MetaAdCreative;
  bid_amount?: number;
  tracking_specs?: Array<Record<string, unknown>>;
  conversion_specs?: Array<Record<string, unknown>>;
  adlabels?: Array<{ id: string; name: string }>;
  source_ad_id?: string;
}

/** Data for updating an ad */
export type UpdateAdData = Partial<Omit<CreateAdData, "adset_id">>;

// ============================================================================
// INSIGHTS / REPORTING TYPES
// ============================================================================

/** Standard insight fields available in Meta Marketing API */
export type MetaInsightField =
  | "account_id"
  | "account_name"
  | "action_values"
  | "actions"
  | "ad_id"
  | "ad_name"
  | "adset_id"
  | "adset_name"
  | "campaign_id"
  | "campaign_name"
  | "canvas_avg_view_percent"
  | "canvas_avg_view_time"
  | "clicks"
  | "conversion_values"
  | "conversions"
  | "cost_per_action_type"
  | "cost_per_conversion"
  | "cost_per_estimated_ad_recallers"
  | "cost_per_inline_link_click"
  | "cost_per_inline_post_engagement"
  | "cost_per_outbound_click"
  | "cost_per_thruplay"
  | "cost_per_unique_action_type"
  | "cost_per_unique_click"
  | "cost_per_unique_inline_link_click"
  | "cost_per_unique_outbound_click"
  | "cpc"
  | "cpm"
  | "cpp"
  | "ctr"
  | "date_start"
  | "date_stop"
  | "estimated_ad_recall_rate"
  | "estimated_ad_recallers"
  | "frequency"
  | "full_view_impressions"
  | "full_view_reach"
  | "impressions"
  | "inline_link_click_ctr"
  | "inline_link_clicks"
  | "inline_post_engagement"
  | "instant_experience_clicks_to_open"
  | "instant_experience_clicks_to_start"
  | "instant_experience_outbound_clicks"
  | "interactive_component_tap"
  | "objective"
  | "outbound_clicks"
  | "outbound_clicks_ctr"
  | "purchase_roas"
  | "qualifying_question_qualify_answer_rate"
  | "reach"
  | "social_spend"
  | "spend"
  | "unique_actions"
  | "unique_clicks"
  | "unique_ctr"
  | "unique_inline_link_click_ctr"
  | "unique_inline_link_clicks"
  | "unique_link_clicks_ctr"
  | "unique_outbound_clicks"
  | "unique_outbound_clicks_ctr"
  | "video_15_sec_watched_actions"
  | "video_30_sec_watched_actions"
  | "video_avg_time_watched_actions"
  | "video_continuous_2_sec_watched_actions"
  | "video_p100_watched_actions"
  | "video_p25_watched_actions"
  | "video_p50_watched_actions"
  | "video_p75_watched_actions"
  | "video_p95_watched_actions"
  | "video_play_actions"
  | "video_play_curve_actions"
  | "video_thruplay_watched_actions"
  | "website_ctr"
  | "website_purchase_roas"
  | "wish_bid";

/** Date range preset options */
export type MetaDatePreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "maximum"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "last_week_mon_sun"
  | "last_week_sun_sat"
  | "last_quarter"
  | "last_year"
  | "this_week_mon_today"
  | "this_week_sun_today"
  | "this_year";

/** Breakdown dimensions for insights */
export type MetaInsightBreakdown =
  | "campaign_id"
  | "adset_id"
  | "ad_id"
  | "age"
  | "gender"
  | "country"
  | "region"
  | "dma"
  | "impression_device"
  | "platform_position"
  | "publisher_platform"
  | "device_platform"
  | "link_url"
  | "image_asset"
  | "video_asset"
  | "product_id"
  | "date_start"
  | "date_stop"
  | "hourly_stats_aggregated_by_advertiser_time_zone"
  | "hourly_stats_aggregated_by_audience_time_zone"
  | "place_page_id"
  | "action_destination"
  | "action_device"
  | "action_target_id"
  | "action_type"
  | "action_reaction";

/** Action values reported by Meta */
export interface MetaActionValue {
  action_type: string;
  value: string;
  _1d_click?: string;
  _1d_view?: string;
  _28d_click?: string;
  _28d_view?: string;
  _7d_click?: string;
  _7d_view?: string;
}

/** Actions reported by Meta */
export interface MetaAction {
  action_type: string;
  value: string;
  _1d_click?: string;
  _1d_view?: string;
  _28d_click?: string;
  _28d_view?: string;
  _7d_click?: string;
  _7d_view?: string;
}

/** Video watched percentage actions */
export interface MetaVideoWatchedAction {
  action_type: string;
  value: string;
}

/** Purchase ROAS metric */
export interface MetaPurchaseRoas {
  action_type: string;
  value: string;
}

/** Outbound click action */
export interface MetaOutboundClick {
  action_type: string;
  value: string;
}

/**
 * Represents Meta Insights (performance metrics)
 * @see https://developers.facebook.com/docs/marketing-api/insights
 */
export interface MetaInsight {
  /** Account ID */
  account_id?: string;
  /** Account name */
  account_name?: string;
  /** Action values (e.g., purchase value) */
  action_values?: MetaActionValue[];
  /** Actions taken (e.g., link clicks, purchases) */
  actions?: MetaAction[];
  /** Ad ID */
  ad_id?: string;
  /** Ad name */
  ad_name?: string;
  /** AdSet ID */
  adset_id?: string;
  /** AdSet name */
  adset_name?: string;
  /** Campaign ID */
  campaign_id?: string;
  /** Campaign name */
  campaign_name?: string;
  /** Number of clicks */
  clicks?: string;
  /** Conversion values */
  conversion_values?: MetaActionValue[];
  /** Conversions */
  conversions?: MetaAction[];
  /** Cost per action type */
  cost_per_action_type?: MetaAction[];
  /** Cost per conversion */
  cost_per_conversion?: MetaAction[];
  /** Cost per unique click */
  cost_per_unique_click?: string;
  /** Cost per click */
  cpc?: string;
  /** Cost per mille (1000 impressions) */
  cpm?: string;
  /** Cost per 1000 reach */
  cpp?: string;
  /** Click-through rate */
  ctr?: string;
  /** Report start date */
  date_start?: string;
  /** Report end date */
  date_stop?: string;
  /** Frequency (impressions / reach) */
  frequency?: string;
  /** Number of impressions */
  impressions?: string;
  /** Inline link clicks */
  inline_link_clicks?: string;
  /** Post engagement */
  inline_post_engagement?: string;
  /** Objective */
  objective?: string;
  /** Outbound clicks */
  outbound_clicks?: MetaOutboundClick[];
  /** Purchase ROAS */
  purchase_roas?: MetaPurchaseRoas[];
  /** Reach (unique users) */
  reach?: string;
  /** Spend */
  spend: string;
  /** Unique clicks */
  unique_clicks?: string;
  /** Unique CTR */
  unique_ctr?: string;
  /** Video play actions */
  video_play_actions?: MetaVideoWatchedAction[];
  /** Video thruplay watched */
  video_thruplay_watched_actions?: MetaVideoWatchedAction[];
  /** Video 15 sec watched */
  video_15_sec_watched_actions?: MetaVideoWatchedAction[];
  /** Video 30 sec watched */
  video_30_sec_watched_actions?: MetaVideoWatchedAction[];
  /** Video p25 watched */
  video_p25_watched_actions?: MetaVideoWatchedAction[];
  /** Video p50 watched */
  video_p50_watched_actions?: MetaVideoWatchedAction[];
  /** Video p75 watched */
  video_p75_watched_actions?: MetaVideoWatchedAction[];
  /** Video p95 watched */
  video_p95_watched_action?: MetaVideoWatchedAction[];
  /** Video p100 watched */
  video_p100_watched_actions?: MetaVideoWatchedAction[];
  /** Website click-through rate */
  website_ctr?: MetaAction[];
  /** Website purchase ROAS */
  website_purchase_roas?: MetaPurchaseRoas[];
}

/** Aggregated performance metrics (computed) */
export interface MetaPerformanceMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  reach: number;
  frequency: number;
}

/** Parameters for insights queries */
export interface GetInsightsParams {
  fields?: MetaInsightField[];
  date_preset?: MetaDatePreset;
  time_range?: { since: string; until: string };
  time_increment?: number | "all_days" | "monthly";
  breakdowns?: MetaInsightBreakdown[];
  action_attribution_windows?: string[];
  action_breakdowns?: string[];
  action_report_time?: "impression" | "conversion" | "mixed";
  level?: "account" | "campaign" | "adset" | "ad";
  filtering?: Array<{ field: string; operator: string; value: string | number }>;
  limit?: number;
  after?: string;
  before?: string;
  sort?: string;
}

// ============================================================================
// AUDIENCE TYPES
// ============================================================================

/** Custom audience type */
export type MetaCustomAudienceType =
  | "CUSTOM"
  | "WEBSITE"
  | "APP"
  | "OFFLINE_CONVERSION"
  | "CLAIM"
  | "PARTNER"
  | "MANAGED"
  | "VIDEO"
  | "LOOKALIKE"
  | "ENGAGEMENT"
  | "DATA_FILE"
  | "STORE"
  | "IG_BUSINESS"
  | "EVENT_BASED"
  | "SEED_LIST"
  | "META_BENEFICIARIES"
  | "PARTNERSHIP_PM";

/** Custom audience subtype */
export type MetaCustomAudienceSubType =
  | "CUSTOM"
  | "WEBSITE"
  | "APP"
  | "OFFLINE_CONVERSION"
  | "CLAIM"
  | "PARTNER"
  | "MANAGED"
  | "VIDEO"
  | "LOOKALIKE"
  | "ENGAGEMENT"
  | "IRIS"
  | "FOX"
  | "MEASUREMENT"
  | "STUDY_RULE_AGGR"
  | "APPS_EVENT"
  | "CUSTOM_MIX"
  | "SMB";

/** Customer file source for data-file audiences */
export type MetaCustomerFileSource =
  | "BOTH_USER_AND_PARTNER_PROVIDED"
  | "USER_PROVIDED_ONLY"
  | "PARTNER_PROVIDED_ONLY";

/** Rule-based audience operator */
export type MetaRuleOperator =
  | "contains"
  | "not_contains"
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "regex_match"
  | "not_regex_match"
  | "starts_with"
  | "i_contains"
  | "i_not_contains"
  | "i_starts_with"
  | "any"
  | "none"
  | "empty"
  | "not_empty"
  | "in"
  | "not_in";

/** Website pixel rule for rule-based audiences */
export interface MetaPixelRule {
  event_name?: string;
  operator?: MetaRuleOperator;
  value?: string | number;
  field?: string;
  rules?: MetaPixelRule[];
  rule_operator?: "and" | "or";
  retentionSeconds?: number;
  data_source?: {
    type: "pixel_id";
    id: string;
  };
}

/**
 * Represents a Meta Custom Audience
 * @see https://developers.facebook.com/docs/marketing-api/reference/custom-audience
 */
export interface MetaAudience {
  id: string;
  name: string;
  account_id: string;
  description?: string;
  /** Audience size approximations */
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  /** Number of active customers in audience */
  customer_file_source?: MetaCustomerFileSource;
  /** Data source for the audience */
  data_source?: {
    type: string;
    sub_type: string;
    creation_params: string;
  };
  /** Delivery status */
  delivery_status?: {
    code: number;
    description: string;
  };
  /** Lookalike audience details */
  lookalike_audience_ids?: string[];
  lookalike_spec?: {
    country: string;
    ratio: number;
    starting_ratio?: number;
    target_countrys?: string[];
    target_dataset?: string;
    type?: string;
  };
  /** Number of matched customers */
  operation_status?: {
    code: number;
    description: string;
  };
  /** Permission for actions */
  permission_for_actions?: {
    can_edit?: boolean;
    can_see_insight?: string;
    can_share?: string;
    can_send?: boolean;
    subtype?: string;
  };
  /** Retention days */
  retention_days?: number;
  /** Audience subtype */
  subtype: MetaCustomAudienceSubType;
  /** Time content was hashed */
  time_content_updated?: number;
  /** Time created */
  time_created?: number;
  /** Time updated */
  time_updated?: number;
  /** Audience type */
  type: MetaCustomAudienceType;
  /** Rule source for pixel-based audiences */
  rule?: string;
  /** Pixel ID for website audiences */
  pixel_id?: string;
  /** Prefilled audience size */
  prefilled?: number;
  /** External event source */
  external_event_source?: string;
  /** Is value-based audience */
  is_value_based?: boolean;
}

/** Parameters for listing audiences */
export interface GetAudiencesParams {
  fields?: string[];
  limit?: number;
  after?: string;
  before?: string;
}

/** Data for creating a custom audience */
export interface CreateCustomAudienceData {
  name: string;
  description?: string;
  subtype?: MetaCustomAudienceSubType;
  customer_file_source?: MetaCustomerFileSource;
  retention_days?: number;
  is_value_based?: boolean;
  allowed_domains?: string[];
  claim_objective?: string;
  event_source_group?: string;
  expectedSize?: number;
}

/** Lookalike audience creation data */
export interface CreateLookalikeAudienceData {
  name: string;
  origin_audience_id: string;
  subtype: "LOOKALIKE";
  lookalike_spec: {
    country: string;
    ratio: number;
    starting_ratio?: number;
    target_countrys?: string[];
    target_dataset?: "CUSTOM_AUDIENCE" | "SITE" | "APP" | "EVENT_SOURCE_GROUP" | "VIDEO" | "ENGAGEMENT" | "PAGE_FANS" | "IG_BUSINESS";
    type?: "customratio" | "similarity" | "reach";
  };
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/** OAuth token response from Meta */
export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/** Long-lived token exchange response */
export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Stored token data (encrypted at rest) */
export interface MetaStoredToken {
  /** Encrypted access token */
  accessToken: string;
  /** Encrypted refresh token (if available) */
  refreshToken?: string;
  /** Token type (usually 'bearer') */
  tokenType: string;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
  /** Scope granted */
  scope?: string[];
  /** When the token was obtained */
  obtainedAt: number;
}

/** Token refresh result */
export interface TokenRefreshResult {
  accessToken: string;
  expiresAt: number;
  success: boolean;
}

/** OAuth configuration for Meta */
export interface MetaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Scopes to request */
  scope?: string[];
  /** API version to use */
  apiVersion?: string;
}

/** Authentication state returned after OAuth callback */
export interface MetaAuthState {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  scope: string[];
  adAccountId?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/** Meta API error sub-error detail */
export interface MetaErrorDetail {
  message: string;
  code: number;
  error_subcode?: number;
  error_user_msg?: string;
  error_user_title?: string;
  is_transient?: boolean;
  error_data?: Record<string, unknown>;
  fbtrace_id?: string;
}

/** Meta API error response body */
export interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_msg?: string;
    error_user_title?: string;
    is_transient?: boolean;
    error_data?: Record<string, unknown>;
    fbtrace_id?: string;
  };
}

/** Platform error types we map to */
export type MetaErrorType =
  | "RATE_LIMIT"
  | "SESSION_EXPIRED"
  | "INSUFFICIENT_PERMISSIONS"
  | "INVALID_PARAMETER"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_ALREADY_EXISTS"
  | "TEMPORARY_ERROR"
  | "AUTHENTICATION_ERROR"
  | "BILLING_ERROR"
  | "POLICY_VIOLATION"
  | "UNKNOWN_ERROR";

/** Extended error class for Meta API errors */
export interface MetaApiError {
  type: MetaErrorType;
  message: string;
  originalError?: MetaErrorResponse;
  httpStatus?: number;
  retryable: boolean;
  fbtraceId?: string;
  code?: number;
  subcode?: number;
}

// ============================================================================
// PAGINATION & RESPONSE TYPES
// ============================================================================

/** Cursor-based pagination from Meta API */
export interface MetaPagination {
  cursors: {
    before: string;
    after: string;
  };
  next?: string;
  previous?: string;
}

/** Generic paginated response wrapper */
export interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: MetaPagination;
  summary?: Record<string, unknown>;
}

/** Generic success response */
export interface MetaSuccessResponse {
  success: boolean;
  id?: string;
  [key: string]: unknown;
}

// ============================================================================
// CLIENT CONFIGURATION TYPES
// ============================================================================

/** Configuration for the Meta API client */
export interface MetaClientConfig {
  /** OAuth app credentials */
  oauth: MetaOAuthConfig;
  /** API version override (e.g., 'v18.0') */
  apiVersion?: string;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Graph API base URL */
  graphUrl?: string;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Retry delay base in ms */
  retryDelayMs?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Rate limit: requests per hour (default: 200 * users) */
  rateLimitPerHour?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Default ad account ID */
  defaultAccountId?: string;
}

/** Request context for logging and debugging */
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status?: number;
  error?: string;
  retryCount?: number;
}
