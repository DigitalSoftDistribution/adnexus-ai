/**
 * Google Ads API Platform Module
 * AdNexus AI Platform
 *
 * Barrel export for all Google Ads API client components.
 */

// Main client
export { GoogleAdsClient, createGoogleAdsClientFromEnv } from "./client";

// Authentication
export { GoogleAdsAuth } from "./auth";

// GAQL Query Builder
export { GAQLBuilder, GAQLPresets } from "./gaql-builder";

// Error handling
export {
  RateLimiter,
  RetryHandler,
  ErrorParser,
  hasPartialFailure,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
} from "./error-handler";

// Types (everything)
export * from "./types";
