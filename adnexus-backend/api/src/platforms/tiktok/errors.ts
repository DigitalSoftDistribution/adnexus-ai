/**
 * TikTok API Error Classification & Retry Logic
 * ==============================================
 * Maps TikTok error codes to typed exceptions and determines retryability.
 */

import { TikTokApiError, TikTokRateLimitError, TikTokAuthError } from "./types";

/** TikTok error code categories */
export const TIKTOK_ERROR_CODES = {
  // Rate limiting
  RATE_LIMIT: 40100,
  RATE_LIMIT_DAILY: 40101,
  RATE_LIMIT_ADV: 40102,

  // Auth errors
  ACCESS_TOKEN_INVALID: 40104,
  ACCESS_TOKEN_EXPIRED: 40105,
  REFRESH_TOKEN_INVALID: 40107,
  REFRESH_TOKEN_EXPIRED: 40108,
  PERMISSION_DENIED: 40300,
  INSUFFICIENT_SCOPE: 40301,

  //Transient / retryable
  INTERNAL_ERROR: 50001,
  SERVICE_UNAVAILABLE: 50300,
  TIMEOUT: 50400,
  GATEWAY_ERROR: 50200,

  // Parameter errors (not retryable)
  PARAM_INVALID: 40001,
  PARAM_MISSING: 40002,
  RESOURCE_NOT_FOUND: 40401,
} as const;

/** HTTP status codes considered transient. */
const TRANSIENT_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** TikTok error codes that are always retryable. */
const RETRYABLE_CODES = new Set([
  TIKTOK_ERROR_CODES.RATE_LIMIT,
  TIKTOK_ERROR_CODES.RATE_LIMIT_DAILY,
  TIKTOK_ERROR_CODES.RATE_LIMIT_ADV,
  TIKTOK_ERROR_CODES.INTERNAL_ERROR,
  TIKTOK_ERROR_CODES.SERVICE_UNAVAILABLE,
  TIKTOK_ERROR_CODES.TIMEOUT,
  TIKTOK_ERROR_CODES.GATEWAY_ERROR,
]);

/** Auth-related error codes that trigger token refresh. */
const AUTH_ERROR_CODES = new Set([
  TIKTOK_ERROR_CODES.ACCESS_TOKEN_INVALID,
  TIKTOK_ERROR_CODES.ACCESS_TOKEN_EXPIRED,
]);

export interface ErrorContext {
  url: string;
  method: string;
  requestId: string;
  statusCode: number;
  responseBody?: Record<string, unknown>;
}

/**
 * Classify a raw TikTok API error response into a typed exception.
 */
export function classifyError(ctx: ErrorContext): TikTokApiError {
  const {
    code = 0,
    message = "Unknown error",
    retry_after,
  } = (ctx.responseBody ?? {}) as { code: number; message: string; retry_after?: number };

  const requestId = ctx.requestId || "unknown";

  // Rate limit
  if (code === TIKTOK_ERROR_CODES.RATE_LIMIT || code === 40101 || code === 40102 || ctx.statusCode === 429) {
    const retryAfterMs = retry_after ? retry_after * 1000 : 1000;
    return new TikTokRateLimitError({
      message: message || "Rate limit exceeded",
      code,
      requestId,
      retryAfterMs,
    });
  }

  // Auth errors
  if (AUTH_ERROR_CODES.has(code) || ctx.statusCode === 401) {
    return new TikTokAuthError({
      message: message || "Authentication failed",
      code,
      requestId,
    });
  }

  // General classification
  const isRetryable =
    RETRYABLE_CODES.has(code) || TRANSIENT_HTTP_STATUS.has(ctx.statusCode);

  return new TikTokApiError({
    message: message || `HTTP ${ctx.statusCode}`,
    code,
    requestId,
    statusCode: ctx.statusCode,
    isRetryable,
  });
}

/**
 * Determine if a given error warrants a retry attempt.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TikTokRateLimitError) return true;
  if (error instanceof TikTokApiError) return error.isRetryable;
  if (error instanceof Error && "code" in error) {
    const code = (error as { code: number }).code;
    return RETRYABLE_CODES.has(code);
  }
  // Network-level errors are always retryable
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("socket") ||
      msg.includes("network") ||
      msg.includes("abort")
    );
  }
  return false;
}

/**
 * Determine if the error indicates an expired/invalid access token.
 */
export function isTokenExpiredError(error: unknown): boolean {
  if (error instanceof TikTokAuthError) return true;
  if (error instanceof TikTokApiError) {
    return AUTH_ERROR_CODES.has(error.code);
  }
  return false;
}

/**
 * Compute backoff delay with full jitter for a given attempt.
 */
export function computeBackoff(attempt: number, baseDelayMs: number): number {
  // Exponential: base * 2^attempt, capped at 30s
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, 30000);
  // Full jitter: random between 0 and capped
  return Math.floor(Math.random() * capped);
}
