/**
 * TikTok Ads API Platform Module
 * ================================
 * Barrel export for the TikTok Ads API integration.
 */

export { TikTokClient } from "./client";
export { TikTokTokenManager } from "./token-manager";
export { TokenBucketRateLimiter } from "./rate-limiter";
export {
  classifyError,
  isRetryableError,
  isTokenExpiredError,
  computeBackoff,
} from "./errors";

// All type definitions
export type {
  // Auth
  TikTokTokenResponse,
  TikTokRefreshTokenResponse,
  TikTokOAuthConfig,

  // Domain Models
  TikTokCampaign,
  TikTokCampaignCreate,
  TikTokCampaignUpdate,
  TikTokCampaignStatus,
  TikTokObjectiveType,
  TikTokBudgetMode,
  TikTokAd,
  TikTokAdCreate,
  TikTokAdUpdate,
  TikTokAdStatus,
  TikTokAdFormat,
  TikTokAdGroup,
  TikTokAdGroupStatus,

  // Insights
  TikTokInsight,
  TikTokInsightParams,
  TikTokDateRange,
  TikTokFilter,

  // Pagination & Response
  TikTokPagination,
  TikTokListParams,
  TikTokListResponse,
  TikTokApiResponse,

  // Config & Errors
  TikTokClientConfig,
  TikTokTokens,
  TikTokApiError,
  TikTokRateLimitError,
  TikTokAuthError,
  TokenBucketState,
} from "./types";
