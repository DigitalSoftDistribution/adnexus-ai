/**
 * @fileoverview Meta Marketing API Client — AdNexus AI Platform Integration
 * @module platforms/meta/client
 *
 * Production-grade Meta Marketing API client with:
 * - OAuth 2.0 authentication (auth URL, token exchange, refresh, long-lived tokens)
 * - Campaign CRUD operations with filtering and pagination
 * - Ad & creative management
 * - Insights & reporting with computed performance metrics
 * - Custom & lookalike audience management
 * - Rate limiting (200×users/hour) with exponential backoff
 * - Automatic token refresh, request retries, and comprehensive error mapping
 * - Full request/response logging with timing
 *
 * @version 1.0.0
 * @author AdNexus AI Engineering
 *
 * @example
 * ```typescript
 * const client = new MetaApiClient({
 *   oauth: {
 *     clientId: process.env.META_APP_ID!,
 *     clientSecret: process.env.META_APP_SECRET!,
 *     redirectUri: 'https://api.adnexus.ai/auth/meta/callback',
 *     scope: ['ads_read', 'ads_management', 'business_management'],
 *   },
 * });
 *
 * // Authenticate
 * const authUrl = client.getAuthUrl('random-state-value');
 * // ... user visits authUrl ...
 * const tokens = await client.exchangeCodeForToken('auth-code');
 *
 * // Use the API
 * const campaigns = await client.getCampaigns('act_1234567890');
 * const insights = await client.getCampaignInsights(
 *   campaignId,
 *   { date_preset: 'last_30d' }
 * );
 * ```
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import crypto from "crypto";
import {
  // Campaign types
  MetaCampaign,
  GetCampaignsParams,
  CreateCampaignData,
  UpdateCampaignData,
  // AdSet types
  MetaAdSet,
  GetAdSetsParams,
  // Ad & Creative types
  MetaAd,
  MetaAdCreative,
  GetAdsParams,
  CreateAdData,
  UpdateAdData,
  // Insight types
  MetaInsight,
  MetaInsightField,
  GetInsightsParams,
  MetaPerformanceMetrics,
  // Audience types
  MetaAudience,
  GetAudiencesParams,
  CreateCustomAudienceData,
  CreateLookalikeAudienceData,
  // Auth types
  MetaTokenResponse,
  MetaLongLivedTokenResponse,
  MetaStoredToken,
  MetaAuthState,
  TokenRefreshResult,
  // Error types
  MetaErrorResponse,
  MetaErrorType,
  MetaApiError,
  // Pagination & response types
  MetaPaginatedResponse,
  MetaSuccessResponse,
  // Config types
  MetaClientConfig,
  RequestContext,
} from "./types";

// Re-export all types for consumers
export * from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default Meta Graph API version */
const DEFAULT_API_VERSION = "v18.0";

/** Meta Graph API base URL */
const META_GRAPH_URL = "https://graph.facebook.com";

/** Meta OAuth dialog URL */
const META_OAUTH_URL = "https://www.facebook.com/dialog/oauth";

/** Default request timeout (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Default max retries for transient errors */
const DEFAULT_MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Rate limit: calls per user per hour (default) */
const DEFAULT_RATE_LIMIT_PER_HOUR = 200;

/** Token refresh buffer: refresh 5 minutes before expiry */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** 
 * Meta error code mapping to our error types.
 * @see https://developers.facebook.com/docs/graph-api/guides/error-handling
 */
const META_ERROR_CODE_MAP: Record<number, MetaErrorType> = {
  // Rate limiting
  4: "RATE_LIMIT",          // Too many API calls
  17: "RATE_LIMIT",         // User request limit reached
  32: "RATE_LIMIT",         // Page request limit reached
  613: "RATE_LIMIT",        // Calls to this API have exceeded rate limit
  80001: "RATE_LIMIT",      // There have been too many calls
  80004: "RATE_LIMIT",      // User request limit reached

  // Session/authentication
  102: "SESSION_EXPIRED",   // Session expired
  190: "SESSION_EXPIRED",   // Access token expired / invalid
  459: "AUTHENTICATION_ERROR", // App secret proof required
  460: "AUTHENTICATION_ERROR", // Invalid session
  463: "SESSION_EXPIRED",   // Session has expired
  464: "SESSION_EXPIRED",   // Session is required
  467: "SESSION_EXPIRED",   // Invalid access token

  // Permissions
  10: "INSUFFICIENT_PERMISSIONS", // Permission is required
  200: "INSUFFICIENT_PERMISSIONS", // Requires ads_management permission
  294: "INSUFFICIENT_PERMISSIONS", // Managing advertisements requires extended permission
  299: "INSUFFICIENT_PERMISSIONS", // Read permissions error
  324: "INSUFFICIENT_PERMISSIONS", // Read-only field cannot be set
  348: "INSUFFICIENT_PERMISSIONS", // Ads management API requires business management API permission

  // Invalid parameters
  100: "INVALID_PARAMETER", // Invalid parameter
  148: "INVALID_PARAMETER", // Invalid adpanel request
  188: "INVALID_PARAMETER", // Adcreative spec is malformed
  340: "INVALID_PARAMETER", // Missing or invalid image file
  366: "INVALID_PARAMETER", // Image fetch failed
  370: "INVALID_PARAMETER", // Image hash doesn't match expected value
  600: "INVALID_PARAMETER", // Invalid filters
  901: "INVALID_PARAMETER", // Invalid image file

  // Not found
  803: "RESOURCE_NOT_FOUND", // Object ID does not exist
  80000: "RESOURCE_NOT_FOUND", // Cannot find ad account
  80003: "RESOURCE_NOT_FOUND", // Ad account not found

  // Already exists
  10800: "RESOURCE_ALREADY_EXISTS", // Object already exists

  // Billing
  2650: "BILLING_ERROR",     // Payment method needed
  2651: "BILLING_ERROR",     // Ad account has unpaid balance
  2652: "BILLING_ERROR",     // Ad account is disabled
  2653: "BILLING_ERROR",     // Ad account has reached its spend limit

  // Policy
  1353037: "POLICY_VIOLATION", // Ad violates policy
  1359116: "POLICY_VIOLATION", // Ad does not comply with policy
};

/** Meta error subcodes for additional context */
const META_ERROR_SUBCODE_MAP: Record<number, MetaErrorType> = {
  // Session subcodes
  458: "SESSION_EXPIRED",
  459: "SESSION_EXPIRED",
  460: "SESSION_EXPIRED",
  463: "SESSION_EXPIRED",
  464: "SESSION_EXPIRED",
  466: "AUTHENTICATION_ERROR",
  467: "SESSION_EXPIRED",
  468: "INVALID_PARAMETER",
  // Rate limit subcodes
  2018001: "RATE_LIMIT",
  2018002: "RATE_LIMIT",
  2018003: "RATE_LIMIT",
};

/** Default insight fields for performance reporting */
const DEFAULT_INSIGHT_FIELDS: MetaInsightField[] = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "impressions",
  "clicks",
  "spend",
  "cpc",
  "cpm",
  "ctr",
  "conversions",
  "conversion_values",
  "cost_per_conversion",
  "purchase_roas",
  "reach",
  "frequency",
  "actions",
  "action_values",
  "date_start",
  "date_stop",
];

/** Default campaign fields */
const DEFAULT_CAMPAIGN_FIELDS = [
  "id",
  "name",
  "account_id",
  "buying_type",
  "objective",
  "status",
  "configured_status",
  "effective_status",
  "created_time",
  "updated_time",
  "daily_budget",
  "lifetime_budget",
  "bid_strategy",
  "spend_cap",
  "special_ad_categories",
  "is_dynamic_creative",
];

/** Default ad fields */
const DEFAULT_AD_FIELDS = [
  "id",
  "name",
  "account_id",
  "adset_id",
  "campaign_id",
  "status",
  "configured_status",
  "effective_status",
  "creative",
  "creative_id",
  "tracking_specs",
  "conversion_specs",
  "bid_amount",
  "created_time",
  "updated_time",
  "issues_info",
  "preview_shareable_link",
  "source_ad_id",
  "approval_status",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure random string.
 * @param length - Desired length of the string (default 32)
 * @returns Hex-encoded random string
 */
function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Sleep/delay utility for retry backoff.
 * @param ms - Milliseconds to delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseMs - Base delay in ms
 * @param maxMs - Maximum delay in ms
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number, baseMs: number, maxMs: number = 60000): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, maxMs);
}

/**
 * Format an ID with the 'act_' prefix for ad account IDs.
 * @param id - Raw account ID
 * @returns Formatted account ID (e.g., "act_1234567890")
 */
function formatAccountId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Map a Meta API error response to our internal error type.
 *
 * @param errorResponse - The error object from Meta's API
 * @returns Structured error information with retryability flag
 */
function mapMetaError(errorResponse: MetaErrorResponse): MetaApiError {
  const metaError = errorResponse.error;
  const code = metaError.code;
  const subcode = metaError.error_subcode;
  const isTransient = metaError.is_transient ?? false;

  // Determine error type from code mapping
  let type: MetaErrorType = META_ERROR_CODE_MAP[code] || "UNKNOWN_ERROR";

  // Check subcode for more specific classification
  if (type === "UNKNOWN_ERROR" && subcode && META_ERROR_SUBCODE_MAP[subcode]) {
    type = META_ERROR_SUBCODE_MAP[subcode];
  }

  // Transient errors are always retryable
  const retryable =
    isTransient ||
    type === "RATE_LIMIT" ||
    type === "TEMPORARY_ERROR" ||
    type === "SESSION_EXPIRED";

  return {
    type,
    message: metaError.error_user_msg || metaError.message,
    originalError: errorResponse,
    httpStatus: undefined,
    retryable,
    fbtraceId: metaError.fbtrace_id,
    code,
    subcode,
  };
}

/**
 * Custom error class for Meta API operations.
 * Extends Error with Meta-specific context for better debugging.
 */
export class MetaMarketingError extends Error {
  public readonly errorType: MetaErrorType;
  public readonly metaCode: number;
  public readonly metaSubcode?: number;
  public readonly fbtraceId?: string;
  public readonly retryable: boolean;
  public readonly originalError?: MetaErrorResponse;
  public readonly httpStatus?: number;

  constructor(metaError: MetaApiError, httpStatus?: number) {
    super(metaError.message);
    this.name = "MetaMarketingError";
    this.errorType = metaError.type;
    this.metaCode = metaError.code || 0;
    this.metaSubcode = metaError.subcode;
    this.fbtraceId = metaError.fbtraceId;
    this.retryable = metaError.retryable;
    this.originalError = metaError.originalError;
    this.httpStatus = httpStatus;
  }
}

// ============================================================================
// LOGGER INTERFACE (pluggable)
// ============================================================================

/** 
 * Logger interface compatible with popular logging libraries (Winston, Pino, Bunyan).
 * Consumers can inject their own logger instance.
 */
export interface MetaApiLogger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

/** Default console-based logger */
const defaultLogger: MetaApiLogger = {
  debug: (msg, meta) => console.debug(`[MetaAPI:DEBUG] ${msg}`, meta || ""),
  info: (msg, meta) => console.info(`[MetaAPI:INFO] ${msg}`, meta || ""),
  warn: (msg, meta) => console.warn(`[MetaAPI:WARN] ${msg}`, meta || ""),
  error: (msg, meta) => console.error(`[MetaAPI:ERROR] ${msg}`, meta || ""),
};

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Sliding-window rate limiter for Meta API calls.
 * Meta enforces 200 calls × (number of users) per hour.
 *
 * Uses a simple in-memory sliding window. For multi-instance deployments,
 * replace with a Redis-backed implementation.
 */
class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: number[] = [];
  private logger: MetaApiLogger;

  /**
   * @param maxRequestsPerHour - Maximum requests allowed per hour
   * @param logger - Logger instance
   */
  constructor(maxRequestsPerHour: number, logger: MetaApiLogger) {
    this.windowMs = 60 * 60 * 1000; // 1 hour
    this.maxRequests = maxRequestsPerHour;
    this.logger = logger;
  }

  /**
   * Check if a request can proceed. Waits if rate limit is hit.
   * @returns Promise that resolves when the request can proceed
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove requests outside the window
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitMs = this.windowMs - (now - oldestRequest) + 100; // +100ms buffer
      this.logger.warn("Rate limit reached, waiting", {
        currentRequests: this.requests.length,
        maxRequests: this.maxRequests,
        waitMs,
      });
      await sleep(waitMs);
      // Recursively retry after waiting
      return this.acquire();
    }

    this.requests.push(now);
  }

  /** Get current request count in window */
  getCurrentCount(): number {
    const now = Date.now();
    return this.requests.filter((t) => now - t < this.windowMs).length;
  }

  /** Get remaining quota */
  getRemaining(): number {
    return Math.max(0, this.maxRequests - this.getCurrentCount());
  }
}

// ============================================================================
// MAIN CLIENT CLASS
// ============================================================================

/**
 * Production-grade Meta Marketing API client.
 *
 * Provides comprehensive access to Meta's Marketing API including campaign
 * management, ad operations, performance insights, audience management, and
 * full OAuth 2.0 authentication with automatic token refresh.
 *
 * ## Authentication Flow
 * 1. Call `getAuthUrl(state)` → redirect user to returned URL
 * 2. User authorizes → Meta redirects to your callback with `?code=...`
 * 3. Call `exchangeCodeForToken(code)` → receive access token
 * 4. Token is automatically refreshed before expiry on all API calls
 *
 * ## Rate Limiting
 * - In-memory sliding window (default: 200 req/hour)
 * - Exponential backoff with jitter on 429 responses
 * - Automatic retry for transient errors (max 3 retries)
 *
 * ## Error Handling
 * - All Meta error codes mapped to typed `MetaErrorType`
 * - Retryable errors automatically retried
 * - Session expiry triggers clear authentication state
 */
export class MetaApiClient {
  private readonly axios: AxiosInstance;
  private readonly config: Required<MetaClientConfig>;
  private readonly logger: MetaApiLogger;
  private readonly rateLimiter: RateLimiter;

  // Token state
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // Request tracking
  private requestLog: RequestContext[] = [];

  /**
   * Create a new MetaApiClient instance.
   *
   * @param config - Client configuration including OAuth credentials
   * @param logger - Optional logger (defaults to console)
   *
   * @example
   * ```typescript
   * const client = new MetaApiClient({
   *   oauth: {
   *     clientId: process.env.META_APP_ID!,
   *     clientSecret: process.env.META_APP_SECRET!,
   *     redirectUri: 'https://api.adnexus.ai/auth/meta/callback',
   *   },
   *   apiVersion: 'v18.0',
   *   maxRetries: 3,
   *   debug: true,
   * });
   * ```
   */
  constructor(config: MetaClientConfig, logger?: MetaApiLogger) {
    this.config = {
      oauth: config.oauth,
      apiVersion: config.apiVersion || DEFAULT_API_VERSION,
      baseUrl: config.baseUrl || META_GRAPH_URL,
      graphUrl: config.graphUrl || META_GRAPH_URL,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      rateLimitPerHour: config.rateLimitPerHour ?? DEFAULT_RATE_LIMIT_PER_HOUR,
      debug: config.debug ?? false,
      defaultAccountId: config.defaultAccountId || "",
    };

    this.logger = logger || defaultLogger;
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerHour, this.logger);

    // Create axios instance
    this.axios = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.apiVersion}`,
      timeout: this.config.timeoutMs,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Generate the OAuth authorization URL to redirect users to.
   *
   * @param state - CSRF protection state parameter (should be random per-session)
   * @param extraParams - Additional OAuth parameters
   * @returns Full authorization URL
   *
   * @example
   * ```typescript
   * const state = crypto.randomBytes(16).toString('hex');
   * const url = client.getAuthUrl(state, { display: 'popup' });
   * res.redirect(url);
   * ```
   */
  getAuthUrl(
    state: string,
    extraParams: Record<string, string> = {}
  ): string {
    const scopes = this.config.oauth.scope || [
      "ads_read",
      "ads_management",
      "business_management",
    ];

    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      scope: scopes.join(","),
      state,
      response_type: "code",
      ...extraParams,
    });

    const url = `${META_OAUTH_URL}?${params.toString()}`;

    this.logger.info("Generated Meta OAuth URL", {
      scopes: scopes.join(","),
      redirectUri: this.config.oauth.redirectUri,
    });

    return url;
  }

  /**
   * Exchange an authorization code for an access token.
   *
   * This is step 2 of the OAuth flow — call after receiving the callback
   * from Meta with the `code` parameter.
   *
   * @param code - The authorization code from Meta's callback
   * @returns Authentication state with tokens and metadata
   * @throws {MetaMarketingError} If the code is invalid or expired
   *
   * @example
   * ```typescript
   * const tokens = await client.exchangeCodeForToken(req.query.code as string);
   * await db.storeEncryptedTokens(userId, 'meta', tokens);
   * ```
   */
  async exchangeCodeForToken(code: string): Promise<MetaAuthState> {
    const response = await axios.get<MetaTokenResponse>(
      `${this.config.graphUrl}/${this.config.apiVersion}/oauth/access_token`,
      {
        params: {
          client_id: this.config.oauth.clientId,
          client_secret: this.config.oauth.clientSecret,
          redirect_uri: this.config.oauth.redirectUri,
          code,
        },
        timeout: this.config.timeoutMs,
      }
    );

    const { access_token, expires_in, refresh_token } = response.data;
    const expiresAt = Date.now() + expires_in * 1000;

    // Store tokens internally
    this.accessToken = access_token;
    this.refreshToken = refresh_token || null;
    this.tokenExpiresAt = expiresAt;

    this.logger.info("Successfully exchanged auth code for token", {
      expiresIn: expires_in,
      hasRefreshToken: !!refresh_token,
    });

    return {
      accessToken: access_token,
      expiresAt,
      refreshToken: refresh_token,
      scope: this.config.oauth.scope || ["ads_read", "ads_management"],
    };
  }

  /**
   * Exchange a short-lived token for a long-lived token (60 days).
   *
   * Meta short-lived tokens expire in ~1 hour. Long-lived tokens last ~60 days
   * and can be refreshed. Call this immediately after receiving a new token.
   *
   * @param shortLivedToken - The short-lived access token to exchange
   * @returns Token refresh result with new expiry
   * @throws {MetaMarketingError} If the token exchange fails
   *
   * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
   *
   * @example
   * ```typescript
   * const result = await client.exchangeForLongLivedToken(tokens.accessToken);
   * console.log(`New token expires at: ${new Date(result.expiresAt)}`);
   * ```
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string
  ): Promise<TokenRefreshResult> {
    const response = await axios.get<MetaLongLivedTokenResponse>(
      `${this.config.graphUrl}/${this.config.apiVersion}/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: this.config.oauth.clientId,
          client_secret: this.config.oauth.clientSecret,
          fb_exchange_token: shortLivedToken,
        },
        timeout: this.config.timeoutMs,
      }
    );

    const { access_token, expires_in } = response.data;
    const expiresAt = Date.now() + expires_in * 1000;

    this.accessToken = access_token;
    this.tokenExpiresAt = expiresAt;

    this.logger.info("Exchanged for long-lived token", {
      expiresInDays: Math.floor(expires_in / 86400),
    });

    return {
      accessToken: access_token,
      expiresAt,
      success: true,
    };
  }

  /**
   * Refresh the access token using the stored refresh token.
   *
   * Automatically called before API requests if the token is near expiry.
   * You can also call manually if you detect a session error.
   *
   * @returns Token refresh result
   * @throws {MetaMarketingError} If no refresh token is available or refresh fails
   *
   * @example
   * ```typescript
   * if (client.isTokenExpired()) {
   *   await client.refreshAccessToken();
   * }
   * ```
   */
  async refreshAccessToken(): Promise<TokenRefreshResult> {
    if (!this.refreshToken) {
      throw new MetaMarketingError(
        {
          type: "AUTHENTICATION_ERROR",
          message: "No refresh token available. User must re-authenticate.",
          retryable: false,
        },
        401
      );
    }

    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.config.graphUrl}/${this.config.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: this.config.oauth.clientId,
            client_secret: this.config.oauth.clientSecret,
            fb_exchange_token: this.refreshToken,
          },
          timeout: this.config.timeoutMs,
        }
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = Date.now() + expires_in * 1000;

      this.accessToken = access_token;
      this.tokenExpiresAt = expiresAt;

      this.logger.info("Successfully refreshed access token", {
        expiresInDays: Math.floor(expires_in / 86400),
      });

      return {
        accessToken: access_token,
        expiresAt,
        success: true,
      };
    } catch (error) {
      this.logger.error("Token refresh failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if the current access token is expired or near expiry.
   *
   * @param bufferMs - Buffer time before expiry to consider token expired (default: 5 min)
   * @returns True if token needs refresh
   */
  isTokenExpired(bufferMs: number = TOKEN_REFRESH_BUFFER_MS): boolean {
    if (!this.accessToken) return true;
    return Date.now() >= this.tokenExpiresAt - bufferMs;
  }

  /**
   * Set the access token directly (e.g., when loading from encrypted storage).
   *
   * @param token - The access token
   * @param expiresAt - Expiration timestamp (ms since epoch)
   * @param refreshToken - Optional refresh token
   */
  setAccessToken(
    token: string,
    expiresAt: number = Date.now() + 3600 * 1000,
    refreshToken?: string
  ): void {
    this.accessToken = token;
    this.tokenExpiresAt = expiresAt;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    this.logger.debug("Access token set directly", {
      expiresAt: new Date(expiresAt).toISOString(),
      hasRefreshToken: !!refreshToken,
    });
  }

  /**
   * Get current token info (for storage/auditing — does NOT expose raw token).
   * @returns Token metadata without the actual token value
   */
  getTokenInfo(): {
    hasToken: boolean;
    expiresAt: number;
    isExpired: boolean;
    hasRefreshToken: boolean;
  } {
    return {
      hasToken: !!this.accessToken,
      expiresAt: this.tokenExpiresAt,
      isExpired: this.isTokenExpired(),
      hasRefreshToken: !!this.refreshToken,
    };
  }

  /**
   * Clear all authentication state. Call on logout or session revocation.
   */
  clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    this.logger.info("Authentication state cleared");
  }

  /**
   * Validate the current access token with Meta's debug endpoint.
   *
   * @returns Token metadata including app ID, user ID, scopes, and expiry
   * @throws {MetaMarketingError} If token is invalid
   */
  async validateToken(): Promise<{
    app_id: string;
    type: string;
    application: string;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  }> {
    if (!this.accessToken) {
      throw new MetaMarketingError(
        {
          type: "AUTHENTICATION_ERROR",
          message: "No access token set",
          retryable: false,
        },
        401
      );
    }

    const response = await axios.get(`${this.config.graphUrl}/debug_token`, {
      params: {
        input_token: this.accessToken,
        access_token: `${this.config.oauth.clientId}|${this.config.oauth.clientSecret}`,
      },
    });

    return response.data.data;
  }

  // ==========================================================================
  // CAMPAIGN MANAGEMENT
  // ==========================================================================

  /**
   * List campaigns for an ad account with optional filtering.
   *
   * @param accountId - Ad account ID (with or without 'act_' prefix)
   * @param params - Query parameters for filtering, pagination, and field selection
   * @returns Paginated list of campaigns
   * @throws {MetaMarketingError} On API errors
   *
   * @example
   * ```typescript
   * const { data: campaigns, paging } = await client.getCampaigns('1234567890', {
   *   status: ['ACTIVE', 'PAUSED'],
   *   objective: ['CONVERSIONS', 'LEAD_GENERATION'],
   *   limit: 25,
   *   fields: ['id', 'name', 'status', 'objective', 'spend'],
   * });
   * ```
   */
  async getCampaigns(
    accountId: string,
    params: GetCampaignsParams = {}
  ): Promise<MetaPaginatedResponse<MetaCampaign>> {
    const formattedId = formatAccountId(accountId);
    const queryParams = this.buildCampaignQueryParams(params);

    const response = await this.request<MetaPaginatedResponse<MetaCampaign>>(
      "GET",
      `/${formattedId}/campaigns`,
      undefined,
      { params: queryParams }
    );

    return response;
  }

  /**
   * Get details for a single campaign.
   *
   * @param campaignId - Campaign ID (e.g., "12033000000000000")
   * @param fields - Specific fields to retrieve (defaults to all)
   * @returns Campaign details
   * @throws {MetaMarketingError} If campaign not found
   *
   * @example
   * ```typescript
   * const campaign = await client.getCampaign('12033000000000000');
   * console.log(`${campaign.name}: ${campaign.objective} (${campaign.status})`);
   * ```
   */
  async getCampaign(
    campaignId: string,
    fields?: string[]
  ): Promise<MetaCampaign> {
    const queryFields = fields || DEFAULT_CAMPAIGN_FIELDS;
    const response = await this.request<MetaCampaign>(
      "GET",
      `/${campaignId}`,
      undefined,
      { params: { fields: queryFields.join(",") } }
    );
    return response;
  }

  /**
   * Create a new campaign.
   *
   * @param accountId - Ad account ID
   * @param data - Campaign creation parameters
   * @returns Created campaign ID and success status
   * @throws {MetaMarketingError} On validation or permission errors
   *
   * @example
   * ```typescript
   * const result = await client.createCampaign('1234567890', {
   *   name: 'Summer Sale 2024',
   *   objective: 'CONVERSIONS',
   *   status: 'PAUSED',
   *   special_ad_categories: ['NONE'],
   * });
   * console.log(`Created campaign: ${result.id}`);
   * ```
   */
  async createCampaign(
    accountId: string,
    data: CreateCampaignData
  ): Promise<{ id: string; success: boolean }> {
    const formattedId = formatAccountId(accountId);

    const response = await this.request<{ id: string }>(
      "POST",
      `/${formattedId}/campaigns`,
      data
    );

    this.logger.info("Campaign created", { campaignId: response.id, name: data.name });

    return { id: response.id, success: true };
  }

  /**
   * Update an existing campaign.
   *
   * Only the fields provided will be updated; others remain unchanged.
   *
   * @param campaignId - Campaign ID to update
   * @param data - Partial campaign data with fields to change
   * @returns Success status
   * @throws {MetaMarketingError} On validation errors
   *
   * @example
   * ```typescript
   * await client.updateCampaign('12033000000000000', {
   *   name: 'Updated Campaign Name',
   *   status: 'ACTIVE',
   *   daily_budget: 5000, // $50.00 in cents
   * });
   * ```
   */
  async updateCampaign(
    campaignId: string,
    data: UpdateCampaignData
  ): Promise<boolean> {
    await this.request<MetaSuccessResponse>(
      "POST",
      `/${campaignId}`,
      data
    );

    this.logger.info("Campaign updated", { campaignId });
    return true;
  }

  /**
   * Delete (archive) a campaign.
   *
   * Meta does not permanently delete campaigns; they are archived.
   * Use `updateCampaign(id, { status: 'DELETED' })` for soft-delete semantics.
   *
   * @param campaignId - Campaign ID to delete
   * @returns Success status
   * @throws {MetaMarketingError} If campaign not found
   *
   * @example
   * ```typescript
   * await client.deleteCampaign('12033000000000000');
   * ```
   */
  async deleteCampaign(campaignId: string): Promise<boolean> {
    await this.request<MetaSuccessResponse>("DELETE", `/${campaignId}`);

    this.logger.info("Campaign deleted", { campaignId });
    return true;
  }

  // ==========================================================================
  // ADSET MANAGEMENT
  // ==========================================================================

  /**
   * List ad sets for an ad account or campaign.
   *
   * @param accountId - Ad account ID
   * @param params - Query parameters including optional campaign_id filter
   * @returns Paginated list of ad sets
   *
   * @example
   * ```typescript
   * const { data: adsets } = await client.getAdSets('1234567890', {
   *   campaign_id: '12033000000000000',
   *   status: ['ACTIVE'],
   * });
   * ```
   */
  async getAdSets(
    accountId: string,
    params: GetAdSetsParams = {}
  ): Promise<MetaPaginatedResponse<MetaAdSet>> {
    const formattedId = formatAccountId(accountId);
    const queryParams = this.buildAdSetQueryParams(params);

    return this.request<MetaPaginatedResponse<MetaAdSet>>(
      "GET",
      `/${formattedId}/adsets`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get a single ad set by ID.
   *
   * @param adSetId - Ad set ID
   * @param fields - Fields to retrieve
   * @returns Ad set details
   */
  async getAdSet(
    adSetId: string,
    fields?: string[]
  ): Promise<MetaAdSet> {
    const queryFields =
      fields || [
        "id",
        "name",
        "campaign_id",
        "account_id",
        "status",
        "configured_status",
        "effective_status",
        "billing_event",
        "optimization_goal",
        "targeting",
        "bid_amount",
        "daily_budget",
        "lifetime_budget",
        "start_time",
        "end_time",
        "created_time",
        "updated_time",
        "promoted_object",
        "attribution_spec",
      ];

    return this.request<MetaAdSet>("GET", `/${adSetId}`, undefined, {
      params: { fields: queryFields.join(",") },
    });
  }

  // ==========================================================================
  // AD MANAGEMENT
  // ==========================================================================

  /**
   * List ads for an ad account, campaign, or ad set.
   *
   * @param accountId - Ad account ID (or campaign ID if using campaign filter)
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of ads
   * @throws {MetaMarketingError} On API errors
   *
   * @example
   * ```typescript
   * // Get all ads in a campaign
   * const { data: ads } = await client.getAds('1234567890', {
   *   campaign_id: '12033000000000000',
   *   status: ['ACTIVE'],
   *   limit: 50,
   * });
   * ```
   */
  async getAds(
    accountId: string,
    params: GetAdsParams = {}
  ): Promise<MetaPaginatedResponse<MetaAd>> {
    const formattedId = formatAccountId(accountId);
    const queryParams = this.buildAdQueryParams(params);

    return this.request<MetaPaginatedResponse<MetaAd>>(
      "GET",
      `/${formattedId}/ads`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get a single ad by ID.
   *
   * @param adId - Ad ID
   * @param fields - Specific fields to retrieve
   * @returns Ad details
   */
  async getAd(adId: string, fields?: string[]): Promise<MetaAd> {
    const queryFields = fields || DEFAULT_AD_FIELDS;
    return this.request<MetaAd>("GET", `/${adId}`, undefined, {
      params: { fields: queryFields.join(",") },
    });
  }

  /**
   * Create a new ad.
   *
   * @param accountId - Ad account ID
   * @param data - Ad creation data including creative reference
   * @returns Created ad ID
   * @throws {MetaMarketingError} On validation errors
   *
   * @example
   * ```typescript
   * const result = await client.createAd('1234567890', {
   *   name: 'My First Ad',
   *   adset_id: '12033000000000001',
   *   status: 'PAUSED',
   *   creative: { id: '12033000000000002' },
   * });
   * ```
   */
  async createAd(
    accountId: string,
    data: CreateAdData
  ): Promise<{ id: string; success: boolean }> {
    const formattedId = formatAccountId(accountId);

    const response = await this.request<{ id: string }>(
      "POST",
      `/${formattedId}/ads`,
      data
    );

    this.logger.info("Ad created", { adId: response.id, name: data.name });
    return { id: response.id, success: true };
  }

  /**
   * Update an existing ad.
   *
   * @param adId - Ad ID to update
   * @param data - Fields to update
   * @returns Success status
   *
   * @example
   * ```typescript
   * await client.updateAd('12033000000000003', {
   *   name: 'Updated Ad Name',
   *   status: 'ACTIVE',
   * });
   * ```
   */
  async updateAd(adId: string, data: UpdateAdData): Promise<boolean> {
    await this.request<MetaSuccessResponse>("POST", `/${adId}`, data);
    this.logger.info("Ad updated", { adId });
    return true;
  }

  /**
   * Delete (archive) an ad.
   *
   * @param adId - Ad ID to delete
   * @returns Success status
   */
  async deleteAd(adId: string): Promise<boolean> {
    await this.request<MetaSuccessResponse>("DELETE", `/${adId}`);
    this.logger.info("Ad deleted", { adId });
    return true;
  }

  /**
   * Get creative assets for an ad.
   *
   * @param adId - Ad ID
   * @returns Creative details including images, videos, and copy
   * @throws {MetaMarketingError} If ad or creative not found
   *
   * @example
   * ```typescript
   * const creatives = await client.getCreatives('12033000000000003');
   * for (const creative of creatives.data) {
   *   console.log(creative.thumbnail_url);
   * }
   * ```
   */
  async getCreatives(
    adId: string
  ): Promise<MetaPaginatedResponse<MetaAdCreative>> {
    const creativeFields = [
      "id",
      "name",
      "object_story_spec",
      "asset_feed_spec",
      "asset_spec",
      "thumbnail_url",
      "body",
      "call_to_action_type",
      "image_hash",
      "image_url",
      "link_url",
      "object_type",
      "status",
      "title",
      "video_id",
      "url_tags",
    ];

    return this.request<MetaPaginatedResponse<MetaAdCreative>>(
      "GET",
      `/${adId}/adcreatives`,
      undefined,
      { params: { fields: creativeFields.join(",") } }
    );
  }

  /**
   * Get the native preview URL for an ad.
   *
   * @param adId - Ad ID
   * @param format - Preview format ('DESKTOP_FEED_STANDARD', 'MOBILE_FEED_STANDARD', etc.)
   * @returns Preview data including URL
   */
  async getAdPreview(
    adId: string,
    format:
      | "DESKTOP_FEED_STANDARD"
      | "MOBILE_FEED_STANDARD"
      | "INSTAGRAM_STANDARD"
      | "INSTAGRAM_STORY"
      | "INSTAGRAM_REELS"
      | "FACEBOOK_REELS_BANNER"
      | "AUDIENCE_NETWORK_REWARDED_VIDEO" = "DESKTOP_FEED_STANDARD"
  ): Promise<{ body: string }> {
    return this.request<{ body: string }>(
      "GET",
      `/${adId}/previews`,
      undefined,
      { params: { ad_format: format } }
    );
  }

  // ==========================================================================
  // INSIGHTS / REPORTING
  // ==========================================================================

  /**
   * Get performance insights for a campaign.
   *
   * @param campaignId - Campaign ID
   * @param params - Insight query parameters (date range, fields, breakdowns)
   * @returns Campaign performance data
   * @throws {MetaMarketingError} On API errors
   *
   * @example
   * ```typescript
   * const { data: insights } = await client.getCampaignInsights(
   *   '12033000000000000',
   *   {
   *     date_preset: 'last_30d',
   *     fields: ['impressions', 'clicks', 'spend', 'ctr', 'cpc'],
   *   }
   * );
   *
   * const metrics = client.computeMetrics(insights[0]);
   * console.log(`ROAS: ${metrics.roas.toFixed(2)}`);
   * ```
   */
  async getCampaignInsights(
    campaignId: string,
    params: Omit<GetInsightsParams, "level"> = {}
  ): Promise<MetaPaginatedResponse<MetaInsight>> {
    const queryParams = this.buildInsightParams({
      ...params,
      level: "campaign",
    });

    return this.request<MetaPaginatedResponse<MetaInsight>>(
      "GET",
      `/${campaignId}/insights`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get performance insights for a single ad.
   *
   * @param adId - Ad ID
   * @param params - Insight query parameters
   * @returns Ad-level performance data
   *
   * @example
   * ```typescript
   * const { data: insights } = await client.getAdInsights('12033000000000003', {
   *   date_preset: 'last_7d',
   *   fields: ['impressions', 'clicks', 'spend', 'conversions'],
   * });
   * ```
   */
  async getAdInsights(
    adId: string,
    params: Omit<GetInsightsParams, "level"> = {}
  ): Promise<MetaPaginatedResponse<MetaInsight>> {
    const queryParams = this.buildInsightParams({
      ...params,
      level: "ad",
    });

    return this.request<MetaPaginatedResponse<MetaInsight>>(
      "GET",
      `/${adId}/insights`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get account-level summary insights.
   *
   * @param accountId - Ad account ID
   * @param params - Insight query parameters
   * @returns Account-level performance data
   *
   * @example
   * ```typescript
   * const { data: insights } = await client.getAccountInsights('1234567890', {
   *   date_preset: 'this_month',
   *   fields: ['spend', 'impressions', 'clicks', 'conversions'],
   *   breakdowns: ['campaign_id'],
   * });
   * ```
   */
  async getAccountInsights(
    accountId: string,
    params: Omit<GetInsightsParams, "level"> = {}
  ): Promise<MetaPaginatedResponse<MetaInsight>> {
    const formattedId = formatAccountId(accountId);
    const queryParams = this.buildInsightParams({
      ...params,
      level: "account",
    });

    return this.request<MetaPaginatedResponse<MetaInsight>>(
      "GET",
      `/${formattedId}/insights`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get insights across ad sets in a campaign.
   *
   * @param campaignId - Campaign ID
   * @param params - Insight query parameters
   * @returns Ad set-level performance data
   */
  async getAdSetInsights(
    campaignId: string,
    params: Omit<GetInsightsParams, "level"> = {}
  ): Promise<MetaPaginatedResponse<MetaInsight>> {
    const queryParams = this.buildInsightParams({
      ...params,
      level: "adset",
    });

    return this.request<MetaPaginatedResponse<MetaInsight>>(
      "GET",
      `/${campaignId}/insights`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Compute derived performance metrics from raw insight data.
   *
   * Calculates CTR, CPC, CPM, CPA, and ROAS from impression/click/spend data.
   *
   * @param insight - Raw insight data from Meta API
   * @returns Computed performance metrics as floating-point numbers
   *
   * @example
   * ```typescript
   * const insight = insights.data[0];
   * const metrics = client.computeMetrics(insight);
   * console.log(`CTR: ${(metrics.ctr * 100).toFixed(2)}%`);
   * console.log(`ROAS: ${metrics.roas.toFixed(2)}x`);
   * ```
   */
  computeMetrics(insight: MetaInsight): MetaPerformanceMetrics {
    const impressions = parseInt(insight.impressions || "0", 10);
    const clicks = parseInt(insight.clicks || "0", 10);
    const spend = parseFloat(insight.spend || "0");
    const reach = parseInt(insight.reach || "0", 10);

    // Calculate conversions from actions array
    let conversions = 0;
    let conversionValue = 0;

    if (insight.actions) {
      const purchaseActions = insight.actions.filter(
        (a) =>
          a.action_type === "purchase" ||
          a.action_type === "offsite_conversion.fb_pixel_purchase"
      );
      conversions = purchaseActions.reduce(
        (sum, a) => sum + parseInt(a.value || "0", 10),
        0
      );
    }

    if (insight.action_values) {
      const purchaseValues = insight.action_values.filter(
        (v) =>
          v.action_type === "purchase" ||
          v.action_type === "offsite_conversion.fb_pixel_purchase"
      );
      conversionValue = purchaseValues.reduce(
        (sum, v) => sum + parseFloat(v.value || "0"),
        0
      );
    }

    // Calculate derived metrics
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? conversionValue / spend : 0;
    const frequency = reach > 0 ? impressions / reach : 0;

    return {
      impressions,
      clicks,
      spend,
      conversions,
      ctr,
      cpc,
      cpm,
      cpa,
      roas,
      reach,
      frequency,
    };
  }

  // ==========================================================================
  // AUDIENCE MANAGEMENT
  // ==========================================================================

  /**
   * List custom audiences for an ad account.
   *
   * @param accountId - Ad account ID
   * @param params - Query parameters
   * @returns Paginated list of custom audiences
   * @throws {MetaMarketingError} On API errors
   *
   * @example
   * ```typescript
   * const { data: audiences } = await client.getCustomAudiences('1234567890');
   * for (const audience of audiences) {
   *   console.log(`${audience.name}: ~${audience.approximate_count_lower_bound} users`);
   * }
   * ```
   */
  async getCustomAudiences(
    accountId: string,
    params: GetAudiencesParams = {}
  ): Promise<MetaPaginatedResponse<MetaAudience>> {
    const formattedId = formatAccountId(accountId);
    const audienceFields = params.fields || [
      "id",
      "name",
      "description",
      "approximate_count_lower_bound",
      "approximate_count_upper_bound",
      "customer_file_source",
      "data_source",
      "delivery_status",
      "lookalike_audience_ids",
      "operation_status",
      "permission_for_actions",
      "retention_days",
      "subtype",
      "time_content_updated",
      "time_created",
      "time_updated",
      "type",
      "rule",
      "pixel_id",
      "is_value_based",
    ];

    const queryParams: Record<string, string | number> = {
      fields: audienceFields.join(","),
      limit: params.limit || 100,
    };

    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    return this.request<MetaPaginatedResponse<MetaAudience>>(
      "GET",
      `/${formattedId}/customaudiences`,
      undefined,
      { params: queryParams }
    );
  }

  /**
   * Get lookalike audiences derived from custom audiences.
   *
   * This filters the full audience list to only those with lookalike specs.
   *
   * @param accountId - Ad account ID
   * @param params - Query parameters
   * @returns List of lookalike audiences
   *
   * @example
   * ```typescript
   * const lookalikes = await client.getLookalikeAudiences('1234567890');
   * for (const audience of lookalikes) {
   *   console.log(`${audience.name}: ${audience.lookalike_spec?.country}`);
   * }
   * ```
   */
  async getLookalikeAudiences(
    accountId: string,
    params: GetAudiencesParams = {}
  ): Promise<MetaAudience[]> {
    const { data: allAudiences } = await this.getCustomAudiences(
      accountId,
      params
    );

    // Filter to only lookalike audiences
    const lookalikes = allAudiences.filter(
      (audience) =>
        audience.subtype === "LOOKALIKE" ||
        audience.lookalike_spec !== undefined ||
        (audience.lookalike_audience_ids &&
          audience.lookalike_audience_ids.length > 0)
    );

    this.logger.info("Retrieved lookalike audiences", {
      totalAudiences: allAudiences.length,
      lookalikeCount: lookalikes.length,
    });

    return lookalikes;
  }

  /**
   * Create a new custom audience.
   *
   * @param accountId - Ad account ID
   * @param data - Audience creation parameters
   * @returns Created audience ID
   * @throws {MetaMarketingError} On validation errors
   *
   * @example
   * ```typescript
   * const result = await client.createCustomAudience('1234567890', {
   *   name: 'Website Visitors - Last 30 Days',
   *   subtype: 'WEBSITE',
   *   description: 'Users who visited the website in the last 30 days',
   *   retention_days: 30,
   *   customer_file_source: 'BOTH_USER_AND_PARTNER_PROVIDED',
   * });
   * ```
   */
  async createCustomAudience(
    accountId: string,
    data: CreateCustomAudienceData
  ): Promise<{ id: string; success: boolean }> {
    const formattedId = formatAccountId(accountId);

    const response = await this.request<{ id: string }>(
      "POST",
      `/${formattedId}/customaudiences`,
      data
    );

    this.logger.info("Custom audience created", {
      audienceId: response.id,
      name: data.name,
    });

    return { id: response.id, success: true };
  }

  /**
   * Create a lookalike audience from a seed audience.
   *
   * @param accountId - Ad account ID
   * @param data - Lookalike audience creation parameters
   * @returns Created audience ID
   *
   * @example
   * ```typescript
   * const result = await client.createLookalikeAudience('1234567890', {
   *   name: 'Lookalike - Website Visitors (1%)',
   *   origin_audience_id: '12033000000000004',
   *   subtype: 'LOOKALIKE',
   *   lookalike_spec: {
   *     country: 'US',
   *     ratio: 0.01,
   *     type: 'similarity',
   *   },
   * });
   * ```
   */
  async createLookalikeAudience(
    accountId: string,
    data: CreateLookalikeAudienceData
  ): Promise<{ id: string; success: boolean }> {
    const formattedId = formatAccountId(accountId);

    const response = await this.request<{ id: string }>(
      "POST",
      `/${formattedId}/customaudiences`,
      data
    );

    this.logger.info("Lookalike audience created", {
      audienceId: response.id,
      name: data.name,
      originAudience: data.origin_audience_id,
    });

    return { id: response.id, success: true };
  }

  /**
   * Delete a custom audience.
   *
   * @param audienceId - Custom audience ID to delete
   * @returns Success status
   */
  async deleteCustomAudience(audienceId: string): Promise<boolean> {
    await this.request<MetaSuccessResponse>("DELETE", `/${audienceId}`);
    this.logger.info("Custom audience deleted", { audienceId });
    return true;
  }

  // ==========================================================================
  // AD ACCOUNT INFO
  // ==========================================================================

  /**
   * Get ad account information.
   *
   * @param accountId - Ad account ID
   * @returns Account details
   */
  async getAdAccount(
    accountId: string
  ): Promise<{
    id: string;
    name: string;
    account_id: string;
    account_status: number;
    amount_spent: string;
    balance: string;
    currency: string;
    timezone_name: string;
    timezone_offset_hours_utc: number;
    business_name?: string;
    end_advertiser?: string;
    end_advertiser_name?: string;
    fb_entity?: number;
    owner?: string;
    spend_cap?: string;
    tier?: number;
  }> {
    const formattedId = formatAccountId(accountId);
    return this.request("GET", `/${formattedId}`, undefined, {
      params: {
        fields: [
          "id",
          "name",
          "account_id",
          "account_status",
          "amount_spent",
          "balance",
          "currency",
          "timezone_name",
          "timezone_offset_hours_utc",
          "business_name",
          "end_advertiser",
          "end_advertiser_name",
          "fb_entity",
          "owner",
          "spend_cap",
        ].join(","),
      },
    });
  }

  // ==========================================================================
  // REQUEST LOGGING & DEBUGGING
  // ==========================================================================

  /**
   * Get the request log for debugging/auditing.
   * @returns Array of recent request contexts with timing info
   */
  getRequestLog(): RequestContext[] {
    return [...this.requestLog];
  }

  /**
   * Get rate limiter status.
   * @returns Current and remaining quota
   */
  getRateLimitStatus(): { current: number; limit: number; remaining: number } {
    return {
      current: this.rateLimiter.getCurrentCount(),
      limit: this.config.rateLimitPerHour,
      remaining: this.rateLimiter.getRemaining(),
    };
  }

  /** Clear the request log */
  clearRequestLog(): void {
    this.requestLog = [];
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Execute an HTTP request to the Meta API with automatic token refresh,
   * rate limiting, retry logic, and comprehensive error handling.
   *
   * @param method - HTTP method
   * @param path - API path (relative to base URL)
   * @param data - Request body for POST/PUT
   * @param config - Additional axios config
   * @returns Response data
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Ensure token is valid before request
    if (this.isTokenExpired()) {
      this.logger.info("Token near expiry, refreshing before request");
      await this.refreshAccessToken();
    }

    // Acquire rate limit slot
    await this.rateLimiter.acquire();

    const requestId = generateSecureToken(8);
    const startTime = Date.now();

    const context: RequestContext = {
      requestId,
      method,
      url: `${this.config.baseUrl}/${this.config.apiVersion}${path}`,
      startTime,
    };

    this.requestLog.push(context);

    // Keep only last 1000 requests in memory
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-500);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        context.retryCount = attempt;

        const response = await this.axios.request<T>({
          method,
          url: path,
          data,
          ...config,
        });

        context.endTime = Date.now();
        context.durationMs = context.endTime - context.startTime;
        context.status = (response as AxiosResponse).status;

        if (this.config.debug) {
          this.logger.debug(`API request succeeded`, {
            requestId,
            method,
            path,
            durationMs: context.durationMs,
            status: context.status,
            attempt: attempt + 1,
          });
        }

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError<MetaErrorResponse>;

        context.endTime = Date.now();
        context.durationMs = context.endTime - context.startTime;
        context.status = axiosError.response?.status;
        context.error = axiosError.message;

        // Handle Meta API error response
        if (axiosError.response?.data?.error) {
          const metaError = mapMetaError(axiosError.response.data);

          this.logger.warn(`Meta API error`, {
            requestId,
            code: metaError.code,
            subcode: metaError.subcode,
            type: metaError.type,
            message: metaError.message,
            retryable: metaError.retryable,
            attempt: attempt + 1,
            fbtraceId: metaError.fbtraceId,
          });

          // Handle session expiration — try token refresh once
          if (
            metaError.type === "SESSION_EXPIRED" &&
            attempt === 0 &&
            this.refreshToken
          ) {
            this.logger.info("Session expired, attempting token refresh");
            try {
              await this.refreshAccessToken();
              continue; // Retry with new token
            } catch {
              // Refresh failed, fall through to error handling
            }
          }

          // Don't retry non-retryable errors
          if (!metaError.retryable || attempt >= this.config.maxRetries) {
            throw new MetaMarketingError(
              metaError,
              axiosError.response?.status
            );
          }

          // Exponential backoff for rate limits and transient errors
          const delay = getBackoffDelay(
            attempt,
            metaError.type === "RATE_LIMIT"
              ? this.config.retryDelayMs * 5 // Longer delay for rate limits
              : this.config.retryDelayMs
          );

          this.logger.info(`Retrying request after ${delay}ms`, {
            requestId,
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
          });

          await sleep(delay);
          continue;
        }

        // Handle network/timeout errors with retry
        if (
          axiosError.code === "ECONNABORTED" ||
          axiosError.code === "ETIMEDOUT" ||
          axiosError.code === "ECONNRESET" ||
          axiosError.code === "ENOTFOUND" ||
          !axiosError.response
        ) {
          if (attempt < this.config.maxRetries) {
            const delay = getBackoffDelay(attempt, this.config.retryDelayMs);
            this.logger.warn(`Network error, retrying after ${delay}ms`, {
              requestId,
              error: axiosError.code,
              attempt: attempt + 1,
            });
            await sleep(delay);
            continue;
          }
        }

        // Non-retryable HTTP error
        throw new MetaMarketingError(
          {
            type: "UNKNOWN_ERROR",
            message: axiosError.message,
            retryable: false,
          },
          axiosError.response?.status
        );
      }
    }

    // All retries exhausted
    throw new MetaMarketingError(
      {
        type: "TEMPORARY_ERROR",
        message: `Request failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`,
        retryable: false,
      },
      500
    );
  }

  /**
   * Configure the axios request interceptor to inject the access token.
   */
  private setupRequestInterceptor(): void {
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Inject access token
        if (this.accessToken) {
          config.params = config.params || {};
          config.params.access_token = this.accessToken;
        }

        // Inject appsecret_proof for enhanced security
        if (this.config.oauth.clientSecret && this.accessToken) {
          const proof = crypto
            .createHmac("sha256", this.config.oauth.clientSecret)
            .update(this.accessToken)
            .digest("hex");
          config.params = config.params || {};
          config.params.appsecret_proof = proof;
        }

        if (this.config.debug) {
          this.logger.debug(`Outgoing request`, {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: { ...config.params, access_token: "[REDACTED]" },
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Configure the axios response interceptor for error normalization.
   */
  private setupResponseInterceptor(): void {
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError<MetaErrorResponse>) => {
        // Let the request handler deal with error details
        return Promise.reject(error);
      }
    );
  }

  // ==========================================================================
  // QUERY PARAMETER BUILDERS
  // ==========================================================================

  /**
   * Build query parameters for campaign list requests.
   */
  private buildCampaignQueryParams(
    params: GetCampaignsParams
  ): Record<string, string | number> {
    const query: Record<string, string | number> = {
      fields: (params.fields || DEFAULT_CAMPAIGN_FIELDS).join(","),
      limit: params.limit || 100,
    };

    if (params.status && params.status.length > 0) {
      query.effective_status = params.status.join(",");
    }
    if (params.objective && params.objective.length > 0) {
      query.objective = params.objective.join(",");
    }
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;
    if (params.date_preset) query.date_preset = params.date_preset;
    if (params.sort) query.sort = params.sort;

    return query;
  }

  /**
   * Build query parameters for ad set list requests.
   */
  private buildAdSetQueryParams(
    params: GetAdSetsParams
  ): Record<string, string | number> {
    const query: Record<string, string | number> = {
      fields: (params.fields || [
        "id",
        "name",
        "campaign_id",
        "account_id",
        "status",
        "configured_status",
        "effective_status",
        "billing_event",
        "optimization_goal",
        "targeting",
        "bid_amount",
        "daily_budget",
        "lifetime_budget",
        "start_time",
        "end_time",
        "created_time",
        "updated_time",
        "promoted_object",
        "attribution_spec",
      ]).join(","),
      limit: params.limit || 100,
    };

    if (params.status && params.status.length > 0) {
      query.effective_status = params.status.join(",");
    }
    if (params.campaign_id) query.campaign_id = params.campaign_id;
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;

    return query;
  }

  /**
   * Build query parameters for ad list requests.
   */
  private buildAdQueryParams(
    params: GetAdsParams
  ): Record<string, string | number> {
    const query: Record<string, string | number> = {
      fields: (params.fields || DEFAULT_AD_FIELDS).join(","),
      limit: params.limit || 100,
    };

    if (params.status && params.status.length > 0) {
      query.effective_status = params.status.join(",");
    }
    if (params.campaign_id) query.campaign_id = params.campaign_id;
    if (params.adset_id) query.adset_id = params.adset_id;
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;

    return query;
  }

  /**
   * Build query parameters for insights requests.
   */
  private buildInsightParams(
    params: GetInsightsParams
  ): Record<string, string | number> {
    const query: Record<string, string | number> = {
      fields: (params.fields || DEFAULT_INSIGHT_FIELDS).join(","),
    };

    // Date range
    if (params.time_range) {
      query.time_range = JSON.stringify(params.time_range);
    } else if (params.date_preset) {
      query.date_preset = params.date_preset;
    } else {
      query.date_preset = "last_30d"; // Default
    }

    // Time increment (daily by default)
    if (params.time_increment !== undefined) {
      query.time_increment = params.time_increment;
    } else {
      query.time_increment = 1; // Daily
    }

    // Breakdowns
    if (params.breakdowns && params.breakdowns.length > 0) {
      query.breakdowns = params.breakdowns.join(",");
    }

    // Action breakdowns
    if (params.action_breakdowns && params.action_breakdowns.length > 0) {
      query.action_breakdowns = params.action_breakdowns.join(",");
    }

    // Attribution windows
    if (
      params.action_attribution_windows &&
      params.action_attribution_windows.length > 0
    ) {
      query.action_attribution_windows =
        params.action_attribution_windows.join(",");
    }

    // Action report time
    if (params.action_report_time) {
      query.action_report_time = params.action_report_time;
    }

    // Level
    if (params.level) {
      query.level = params.level;
    }

    // Filtering
    if (params.filtering && params.filtering.length > 0) {
      query.filtering = JSON.stringify(params.filtering);
    }

    // Pagination
    if (params.limit) query.limit = params.limit;
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;
    if (params.sort) query.sort = params.sort;

    return query;
  }
}

// ============================================================================
// FACTORY & CONVENIENCE EXPORTS
// ============================================================================

/**
 * Create a MetaApiClient from environment variables.
 *
 * Expected environment variables:
 * - META_APP_ID — OAuth app ID
 * - META_APP_SECRET — OAuth app secret
 * - META_REDIRECT_URI — OAuth redirect URI
 * - META_API_VERSION — API version (optional, defaults to v18.0)
 * - META_RATE_LIMIT_PER_HOUR — Rate limit (optional)
 *
 * @param logger - Optional logger instance
 * @returns Configured MetaApiClient
 *
 * @example
 * ```typescript
 * const client = createClientFromEnv();
 * ```
 */
export function createClientFromEnv(logger?: MetaApiLogger): MetaApiClient {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing required environment variables: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI"
    );
  }

  return new MetaApiClient(
    {
      oauth: {
        clientId,
        clientSecret,
        redirectUri,
        scope: ["ads_read", "ads_management", "business_management"],
      },
      apiVersion: process.env.META_API_VERSION,
      rateLimitPerHour: process.env.META_RATE_LIMIT_PER_HOUR
        ? parseInt(process.env.META_RATE_LIMIT_PER_HOUR, 10)
        : undefined,
      maxRetries: 3,
      debug: process.env.NODE_ENV !== "production",
    },
    logger
  );
}

/**
 * Decrypt a stored token for use with the client.
 * This is a placeholder — integrate with your actual encryption service.
 *
 * @param encryptedToken - Token data from database
 * @returns Decrypted token data
 */
export function decryptStoredToken(encryptedToken: MetaStoredToken): {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
} {
  // TODO: Integrate with your encryption service (e.g., AWS KMS, HashiCorp Vault)
  // This example assumes tokens are stored with reversible encryption
  return {
    accessToken: encryptedToken.accessToken,
    refreshToken: encryptedToken.refreshToken,
    expiresAt: encryptedToken.expiresAt,
  };
}

/** Default export */
export default MetaApiClient;
