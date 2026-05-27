/**
 * AdNexus AI — Platform Error Classes
 *
 * Provides a hierarchy of platform-specific errors with rich context
 * for debugging, retry decisions, and user-facing messages.
 *
 * Error Hierarchy:
 *   PlatformAPIError (base)
 *   ├── PlatformAuthError      → 401 / token issues
 *   ├── PlatformRateLimitError → 429 / quota exceeded
 *   ├── PlatformValidationError→ 400 / invalid parameters
 *   ├── PlatformNotFoundError  → 404 / resource missing
 *   ├── PlatformServerError    → 5xx / platform-side failures
 *   └── PlatformNetworkError   → DNS, timeout, connection dropped
 */

import type { Platform } from './types';

// ──────────────────────────────────────────────
// Error Codes (exhaustive catalog)
// ──────────────────────────────────────────────

export type PlatformErrorCode =
  // Authentication & authorization
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_REFRESH_FAILED'
  | 'AUTH_INSUFFICIENT_SCOPE'
  | 'AUTH_REVOKED'
  | 'AUTH_MFA_REQUIRED'
  // Rate limiting
  | 'RATE_LIMIT_MINUTE'
  | 'RATE_LIMIT_HOUR'
  | 'RATE_LIMIT_DAY'
  | 'RATE_LIMIT_QUOTA_EXCEEDED'
  | 'RATE_LIMIT_BURST'
  // Validation
  | 'VALIDATION_MISSING_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'VALIDATION_OUT_OF_RANGE'
  | 'VALIDATION_DUPLICATE_NAME'
  | 'VALIDATION_POLICY_VIOLATION'
  // Resource
  | 'NOT_FOUND_CAMPAIGN'
  | 'NOT_FOUND_AD'
  | 'NOT_FOUND_ACCOUNT'
  | 'NOT_FOUND_AUDIENCE'
  // Server
  | 'SERVER_INTERNAL_ERROR'
  | 'SERVER_MAINTENANCE'
  | 'SERVER_TIMEOUT'
  | 'SERVER_GATEWAY'
  // Network
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_DNS'
  | 'NETWORK_CONNECTION_RESET'
  | 'NETWORK_TLS'
  // Catch-all
  | 'UNKNOWN_ERROR';

// ──────────────────────────────────────────────
// Base Error Class
// ──────────────────────────────────────────────

export interface PlatformErrorContext {
  /** HTTP status code if applicable */
  httpStatusCode?: number;
  /** Platform-specific error code (raw) */
  platformErrorCode?: string;
  /** Platform-specific error message (raw) */
  platformErrorMessage?: string;
  /** Request ID for tracking */
  requestId?: string;
  /** Endpoint that was called */
  endpoint?: string;
  /** Timestamp of the error */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export class PlatformAPIError extends Error {
  /** The platform that threw the error */
  public readonly platform: Platform;

  /** Normalized error code */
  public readonly code: PlatformErrorCode;

  /** Whether the operation can be retried */
  public readonly retryable: boolean;

  /** Suggested retry delay in milliseconds (if retryable) */
  public readonly retryAfterMs: number;

  /** Rich error context for debugging */
  public readonly context: PlatformErrorContext;

  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    retryable: boolean = false,
    retryAfterMs: number = 0,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(`[${platform.toUpperCase()}] ${code}: ${message}`);
    this.name = 'PlatformAPIError';
    this.platform = platform;
    this.code = code;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PlatformAPIError);
    }
  }

  /** Serialize to a JSON-friendly object for logging / API responses */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      platform: this.platform,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      context: this.context,
      stack: this.stack,
    };
  }

  /** Create a user-facing error message (no internal details) */
  toUserMessage(): string {
    const friendlyMessages: Record<PlatformErrorCode, string> = {
      AUTH_TOKEN_EXPIRED: 'Your session has expired. Please reconnect your account.',
      AUTH_TOKEN_INVALID: 'Your account connection is invalid. Please reconnect.',
      AUTH_REFRESH_FAILED: 'Failed to refresh your account connection. Please reconnect.',
      AUTH_INSUFFICIENT_SCOPE: 'Missing permissions. Please reconnect with full access.',
      AUTH_REVOKED: 'Account access was revoked. Please reconnect.',
      AUTH_MFA_REQUIRED: 'Multi-factor authentication required. Please reconnect.',
      RATE_LIMIT_MINUTE: 'Too many requests. Please wait a moment and try again.',
      RATE_LIMIT_HOUR: 'Hourly API limit reached. Please try again later.',
      RATE_LIMIT_DAY: 'Daily API limit reached. Please try again tomorrow.',
      RATE_LIMIT_QUOTA_EXCEEDED: 'Ad account spending quota exceeded. Contact your platform.',
      RATE_LIMIT_BURST: 'Request burst limit exceeded. Please slow down.',
      VALIDATION_MISSING_FIELD: 'A required field is missing. Please check your input.',
      VALIDATION_INVALID_FORMAT: 'Invalid data format. Please check your input.',
      VALIDATION_OUT_OF_RANGE: 'A value is out of the allowed range.',
      VALIDATION_DUPLICATE_NAME: 'A campaign with this name already exists.',
      VALIDATION_POLICY_VIOLATION: 'This content violates platform policies.',
      NOT_FOUND_CAMPAIGN: 'Campaign not found. It may have been deleted.',
      NOT_FOUND_AD: 'Ad not found. It may have been deleted.',
      NOT_FOUND_ACCOUNT: 'Ad account not found. Please check your connection.',
      NOT_FOUND_AUDIENCE: 'Audience not found. It may have been removed.',
      SERVER_INTERNAL_ERROR: 'The platform experienced an error. Please try again.',
      SERVER_MAINTENANCE: 'The platform is under maintenance. Please try again later.',
      SERVER_TIMEOUT: 'The platform took too long to respond. Please try again.',
      SERVER_GATEWAY: 'Platform gateway error. Please try again.',
      NETWORK_TIMEOUT: 'Network timeout. Please check your connection.',
      NETWORK_DNS: 'DNS resolution failed. Please check your network.',
      NETWORK_CONNECTION_RESET: 'Connection was reset. Please try again.',
      NETWORK_TLS: 'Secure connection failed. Please try again.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };
    return friendlyMessages[this.code] || 'An unexpected error occurred. Please try again.';
  }

  /** Factory: create from an HTTP response */
  static fromHttpResponse(
    platform: Platform,
    statusCode: number,
    platformErrorCode: string,
    platformMessage: string,
    requestId?: string,
    endpoint?: string,
    retryAfterHeader?: string,
  ): PlatformAPIError {
    const code = mapHttpStatusToErrorCode(statusCode, platformErrorCode);
    const retryable = isRetryableStatusCode(statusCode);
    const retryAfterMs = retryAfterHeader
      ? parseRetryAfter(retryAfterHeader)
      : retryable
        ? DEFAULT_RETRY_AFTER_MS
        : 0;

    return new PlatformAPIError(platform, code, platformMessage, retryable, retryAfterMs, {
      httpStatusCode: statusCode,
      platformErrorCode,
      platformErrorMessage: platformMessage,
      requestId,
      endpoint,
    });
  }
}

// ──────────────────────────────────────────────
// Specialized Error Subclasses
// ──────────────────────────────────────────────

/** 401 / 403 / token-related errors */
export class PlatformAuthError extends PlatformAPIError {
  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, message, false, 0, context);
    this.name = 'PlatformAuthError';
  }
}

/** 429 / rate-limit / quota errors — always retryable */
export class PlatformRateLimitError extends PlatformAPIError {
  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    retryAfterMs: number,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, message, true, retryAfterMs, context);
    this.name = 'PlatformRateLimitError';
  }
}

/** 400 / validation / bad-request errors */
export class PlatformValidationError extends PlatformAPIError {
  /** Field-level validation errors if available */
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, message, false, 0, context);
    this.name = 'PlatformValidationError';
    this.fieldErrors = fieldErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

/** 404 / not-found errors */
export class PlatformNotFoundError extends PlatformAPIError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    resourceType: string,
    resourceId: string,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, `${resourceType} '${resourceId}' not found on ${platform}.`, false, 0, context);
    this.name = 'PlatformNotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

/** 5xx / platform server errors */
export class PlatformServerError extends PlatformAPIError {
  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    retryAfterMs: number = DEFAULT_RETRY_AFTER_MS,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, message, true, retryAfterMs, context);
    this.name = 'PlatformServerError';
  }
}

/** Network-level errors (DNS, TCP, TLS, timeout) */
export class PlatformNetworkError extends PlatformAPIError {
  public readonly cause?: Error;

  constructor(
    platform: Platform,
    code: PlatformErrorCode,
    message: string,
    retryable: boolean = true,
    cause?: Error,
    context: Partial<PlatformErrorContext> = {},
  ) {
    super(platform, code, message, retryable, DEFAULT_RETRY_AFTER_MS, context);
    this.name = 'PlatformNetworkError';
    this.cause = cause;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      cause: this.cause?.message,
    };
  }
}

// ──────────────────────────────────────────────
// Error Classification Helpers
// ──────────────────────────────────────────────

const DEFAULT_RETRY_AFTER_MS = 5000;

/** Determine if an HTTP status code warrants a retry */
function isRetryableStatusCode(statusCode: number): boolean {
  switch (statusCode) {
    case 408: // Request Timeout
    case 429: // Too Many Requests
    case 500: // Internal Server Error
    case 502: // Bad Gateway
    case 503: // Service Unavailable
    case 504: // Gateway Timeout
      return true;
    default:
      return false;
  }
}

/** Map HTTP status + raw platform code → normalized PlatformErrorCode */
function mapHttpStatusToErrorCode(
  statusCode: number,
  platformCode: string,
): PlatformErrorCode {
  const normalized = platformCode.toUpperCase().replace(/\s+/g, '_');

  // Platform-specific overrides
  if (normalized.includes('EXPIRED') || normalized.includes('SESSION')) {
    return 'AUTH_TOKEN_EXPIRED';
  }
  if (normalized.includes('INVALID_TOKEN') || normalized === '190') {
    return 'AUTH_TOKEN_INVALID';
  }
  if (normalized.includes('QUOTA') || normalized.includes('LIMIT')) {
    return 'RATE_LIMIT_QUOTA_EXCEEDED';
  }
  if (normalized.includes('MISSING') || normalized.includes('REQUIRED')) {
    return 'VALIDATION_MISSING_FIELD';
  }
  if (normalized.includes('NOT_FOUND') || normalized.includes('DELETED')) {
    return 'NOT_FOUND_CAMPAIGN';
  }

  // Status-code-based mapping
  switch (statusCode) {
    case 400:
      return 'VALIDATION_INVALID_FORMAT';
    case 401:
      return 'AUTH_TOKEN_EXPIRED';
    case 403:
      return 'AUTH_INSUFFICIENT_SCOPE';
    case 404:
      return 'NOT_FOUND_CAMPAIGN';
    case 408:
      return 'SERVER_TIMEOUT';
    case 429:
      return 'RATE_LIMIT_MINUTE';
    case 500:
      return 'SERVER_INTERNAL_ERROR';
    case 502:
      return 'SERVER_GATEWAY';
    case 503:
      return 'SERVER_MAINTENANCE';
    case 504:
      return 'SERVER_GATEWAY';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/** Parse Retry-After header (seconds or HTTP-date) */
function parseRetryAfter(value: string): number {
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }
  // Try parsing as HTTP-date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  return DEFAULT_RETRY_AFTER_MS;
}

// ──────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────

/** Check if an error is any PlatformAPIError */
export function isPlatformError(error: unknown): error is PlatformAPIError {
  return error instanceof PlatformAPIError;
}

/** Check if an error is retryable */
export function isRetryableError(error: unknown): boolean {
  if (!isPlatformError(error)) return false;
  return error.retryable;
}

/** Get retry-after delay from an error */
export function getRetryAfterMs(error: unknown): number {
  if (!isPlatformError(error)) return 0;
  return error.retryAfterMs;
}

/** Check if an error is authentication-related */
export function isAuthError(error: unknown): boolean {
  return error instanceof PlatformAuthError;
}

/** Check if an error is rate-limit related */
export function isRateLimitError(error: unknown): boolean {
  return error instanceof PlatformRateLimitError;
}

/** Wrap any unknown error into a PlatformAPIError */
export function wrapError(
  platform: Platform,
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred',
): PlatformAPIError {
  if (isPlatformError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('EAI_AGAIN') ||
      error.message.includes('getaddrinfo')
    ) {
      return new PlatformNetworkError(
        platform,
        'NETWORK_DNS',
        `DNS lookup failed: ${error.message}`,
        true,
        error,
      );
    }
    if (
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNABORTED') ||
      error.message.includes('timeout')
    ) {
      return new PlatformNetworkError(
        platform,
        'NETWORK_TIMEOUT',
        `Request timed out: ${error.message}`,
        true,
        error,
      );
    }
    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('socket hang up')
    ) {
      return new PlatformNetworkError(
        platform,
        'NETWORK_CONNECTION_RESET',
        `Connection reset: ${error.message}`,
        true,
        error,
      );
    }

    return new PlatformAPIError(platform, 'UNKNOWN_ERROR', error.message, false, 0);
  }

  return new PlatformAPIError(
    platform,
    'UNKNOWN_ERROR',
    typeof error === 'string' ? error : fallbackMessage,
    false,
    0,
  );
}
