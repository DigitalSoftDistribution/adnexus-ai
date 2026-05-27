/**
 * AdNexus AI — Platform Configuration
 *
 * Centralised API endpoints, rate limits, retry policies, and
 * feature flags for each supported advertising platform.
 */

import type {
  Platform,
  PlatformConfig,
  PlatformConfigEntry,
  PlatformFeature,
  RateLimitConfig,
  RetryPolicyConfig,
} from './types';

// ──────────────────────────────────────────────
// Platform Feature Sets
// ──────────────────────────────────────────────

const META_FEATURES: PlatformFeature[] = [
  'campaign_management',
  'ad_management',
  'audience_targeting',
  'budget_automation',
  'advanced_reporting',
  'video_ads',
  'lead_gen_ads',
  'dynamic_creative',
  'a_b_testing',
  'offline_conversions',
];

const GOOGLE_FEATURES: PlatformFeature[] = [
  'campaign_management',
  'ad_management',
  'audience_targeting',
  'budget_automation',
  'advanced_reporting',
  'video_ads',
  'lead_gen_ads',
  'dynamic_creative',
  'a_b_testing',
  'offline_conversions',
];

const TIKTOK_FEATURES: PlatformFeature[] = [
  'campaign_management',
  'ad_management',
  'audience_targeting',
  'budget_automation',
  'advanced_reporting',
  'video_ads',
  'lead_gen_ads',
  'dynamic_creative',
  'a_b_testing',
];

const SNAP_FEATURES: PlatformFeature[] = [
  'campaign_management',
  'ad_management',
  'audience_targeting',
  'budget_automation',
  'advanced_reporting',
  'video_ads',
  'lead_gen_ads',
  'a_b_testing',
];

// ──────────────────────────────────────────────
// Rate Limit Defaults
// ──────────────────────────────────────────────

/** Meta Marketing API v18 rate limits (per app/user/ad account) */
const META_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 30,
  requestsPerMinute: 200,
  requestsPerHour: 5000,
  requestsPerDay: 100_000,
  burstLimit: 50,
  retryAfterHeader: 'x-app-usage',
};

/** Google Ads API rate limits (per developer token / account) */
const GOOGLE_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 10,
  requestsPerMinute: 60,
  requestsPerHour: 1500,
  requestsPerDay: 30_000,
  burstLimit: 15,
  retryAfterHeader: 'retry-after',
};

/** TikTok Ads API rate limits (per app / advertiser) */
const TIKTOK_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 20,
  requestsPerMinute: 100,
  requestsPerHour: 3000,
  requestsPerDay: 50_000,
  burstLimit: 30,
  retryAfterHeader: 'x-ratelimit-reset',
};

/** Snap Marketing API rate limits (per organization) */
const SNAP_RATE_LIMIT: RateLimitConfig = {
  requestsPerSecond: 5,
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  requestsPerDay: 20_000,
  burstLimit: 10,
  retryAfterHeader: 'retry-after',
};

// ──────────────────────────────────────────────
// Retry Policies
// ──────────────────────────────────────────────

/** Default retry policy for all platforms */
const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  exponentialBase: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/** Conservative retry policy for stricter platforms */
const CONSERVATIVE_RETRY_POLICY: RetryPolicyConfig = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30_000,
  exponentialBase: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

// ──────────────────────────────────────────────
// Scopes
// ──────────────────────────────────────────────

const META_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
  'pages_read_engagement',
];

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/adwords',
];

const TIKTOK_SCOPES = [
  'ads.read',
  'ads.write',
  'advertiser.info',
  'audience_management',
  'bc.read',
];

const SNAP_SCOPES = [
  'snapchat-marketing-api',
  'campaigns',
  'organizations',
  'audience',
  'segments',
];

// ──────────────────────────────────────────────
// Per-Platform Configurations
// ──────────────────────────────────────────────

/** Meta (Facebook / Instagram) Marketing API */
const META_CONFIG: PlatformConfigEntry = {
  platform: 'meta',
  apiBaseUrl: 'https://graph.facebook.com',
  apiVersion: 'v18.0',
  authBaseUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  authTokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  rateLimit: META_RATE_LIMIT,
  retryPolicy: DEFAULT_RETRY_POLICY,
  timeoutMs: 30_000,
  scopes: META_SCOPES,
  features: META_FEATURES,
};

/** Google Ads API */
const GOOGLE_CONFIG: PlatformConfigEntry = {
  platform: 'google',
  apiBaseUrl: 'https://googleads.googleapis.com',
  apiVersion: 'v15',
  authBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  authTokenUrl: 'https://oauth2.googleapis.com/token',
  rateLimit: GOOGLE_RATE_LIMIT,
  retryPolicy: CONSERVATIVE_RETRY_POLICY,
  timeoutMs: 45_000,
  scopes: GOOGLE_SCOPES,
  features: GOOGLE_FEATURES,
};

/** TikTok Ads API */
const TIKTOK_CONFIG: PlatformConfigEntry = {
  platform: 'tiktok',
  apiBaseUrl: 'https://business-api.tiktok.com/open_api',
  apiVersion: 'v1.3',
  authBaseUrl: 'https://ads.tiktok.com/marketing_api/auth',
  authTokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
  rateLimit: TIKTOK_RATE_LIMIT,
  retryPolicy: DEFAULT_RETRY_POLICY,
  timeoutMs: 30_000,
  scopes: TIKTOK_SCOPES,
  features: TIKTOK_FEATURES,
};

/** Snap Marketing API */
const SNAP_CONFIG: PlatformConfigEntry = {
  platform: 'snap',
  apiBaseUrl: 'https://adsapi.snapchat.com',
  apiVersion: 'v1',
  authBaseUrl: 'https://accounts.snapchat.com/accounts/oauth2/auth',
  authTokenUrl: 'https://accounts.snapchat.com/accounts/oauth2/token',
  rateLimit: SNAP_RATE_LIMIT,
  retryPolicy: DEFAULT_RETRY_POLICY,
  timeoutMs: 30_000,
  scopes: SNAP_SCOPES,
  features: SNAP_FEATURES,
};

// ──────────────────────────────────────────────
// Default Values
// ──────────────────────────────────────────────

const DEFAULTS = {
  currency: 'USD',
  timezone: 'America/New_York',
  dateFormat: 'YYYY-MM-DD',
};

// ──────────────────────────────────────────────
// Exported Full Configuration
// ──────────────────────────────────────────────

/**
 * Complete platform configuration used by PlatformManager.
 * All values are read-only and frozen at module load time.
 */
export const PLATFORM_CONFIG: Readonly<PlatformConfig> = Object.freeze({
  meta: Object.freeze({ ...META_CONFIG }),
  google: Object.freeze({ ...GOOGLE_CONFIG }),
  tiktok: Object.freeze({ ...TIKTOK_CONFIG }),
  snap: Object.freeze({ ...SNAP_CONFIG }),
  defaults: Object.freeze({ ...DEFAULTS }),
});

// ──────────────────────────────────────────────
// Access Helpers
// ──────────────────────────────────────────────

/** Retrieve configuration for a specific platform */
export function getPlatformConfig(platform: Platform): Readonly<PlatformConfigEntry> {
  switch (platform) {
    case 'meta':
      return PLATFORM_CONFIG.meta;
    case 'google':
      return PLATFORM_CONFIG.google;
    case 'tiktok':
      return PLATFORM_CONFIG.tiktok;
    case 'snap':
      return PLATFORM_CONFIG.snap;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/** Get all supported platforms */
export function getAllPlatforms(): Platform[] {
  return ['meta', 'google', 'tiktok', 'snap'];
}

/** Check if a platform supports a specific feature */
export function platformSupportsFeature(platform: Platform, feature: PlatformFeature): boolean {
  return getPlatformConfig(platform).features.includes(feature);
}

/** Get OAuth authorization URL for a platform */
export function getOAuthUrl(
  platform: Platform,
  clientId: string,
  redirectUri: string,
  state: string,
  scope?: string,
): string {
  const config = getPlatformConfig(platform);

  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('redirect_uri', redirectUri);
  params.set('state', state);
  params.set('response_type', 'code');

  if (scope) {
    params.set('scope', scope);
  } else {
    params.set('scope', config.scopes.join(' '));
  }

  // Platform-specific overrides
  if (platform === 'meta') {
    params.set('config_id', 'oauth');
  }
  if (platform === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('include_granted_scopes', 'true');
  }
  if (platform === 'tiktok') {
    // TikTok uses comma-separated scopes
    params.set('scope', (scope || config.scopes.join(',')).replace(/\s+/g, ','));
  }
  if (platform === 'snap') {
    params.set('scope', scope || config.scopes.join(' '));
  }

  return `${config.authBaseUrl}?${params.toString()}`;
}

/** Get token endpoint URL for a platform */
export function getTokenUrl(platform: Platform): string {
  return getPlatformConfig(platform).authTokenUrl;
}

/** Get API base URL (including version path) for a platform */
export function getApiBaseUrl(platform: Platform): string {
  const config = getPlatformConfig(platform);
  if (platform === 'google') {
    return `${config.apiBaseUrl}/${config.apiVersion}`;
  }
  if (platform === 'tiktok') {
    return config.apiBaseUrl; // TikTok includes version in individual paths
  }
  return `${config.apiBaseUrl}/${config.apiVersion}`;
}
