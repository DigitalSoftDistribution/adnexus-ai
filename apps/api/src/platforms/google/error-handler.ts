/**
 * Google Ads API - Error Handler & Retry Logic
 * AdNexus AI Platform
 *
 * Provides exponential backoff retry logic, rate limit tracking,
 * partial failure handling, and custom error classification for
 * Google Ads API operations.
 */

import {
import { getModuleLogger } from "../../../lib/logger";
  GoogleAdsApiError,
  GoogleAdsErrorResponse,
  GoogleAdsErrorDetail,
  RetryConfig,
  RateLimitConfig,
  RateLimitState,
  MutateResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Default Configurations
// ---------------------------------------------------------------------------

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  exponentialBase: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  retryableErrorCodes: [
    "UNAVAILABLE",
    "DEADLINE_EXCEEDED",
    "RESOURCE_EXHAUSTED",
    "ABORTED",
    "INTERNAL",
    "RATE_LIMIT_EXCEEDED",
    "QUOTA_EXCEEDED",
  ],
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxOperationsPerDay: 15000,
  maxOperationsPerHour: 10000,
  maxOperationsPerMinute: 600,
  maxConcurrentRequests: 10,
  retryConfig: DEFAULT_RETRY_CONFIG,
};

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

/**
 * Tracks and enforces Google Ads API rate limits.
 * Google Ads API has a 15,000 operations per day limit for standard access,
 * with additional per-minute and per-hour limits.
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;
  private requestQueue: Array<() => void> = [];
  private concurrentRequests: number = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.state = {
      dailyOperationCount: 0,
      hourlyOperationCount: 0,
      minuteOperationCount: 0,
      concurrentRequests: 0,
      lastResetTime: {
        daily: Date.now(),
        hourly: Date.now(),
        minute: Date.now(),
      },
    };
  }

  /**
   * Check if an operation can proceed under current rate limits.
   * Throws GoogleAdsApiError if limits would be exceeded.
   */
  checkLimit(operationCount: number = 1): void {
    this.resetCountersIfNeeded();

    if (this.state.dailyOperationCount + operationCount > this.config.maxOperationsPerDay) {
      throw new GoogleAdsApiError(
        `Daily operation limit exceeded: ${this.state.dailyOperationCount}/${this.config.maxOperationsPerDay} operations used. ` +
          `Resets at midnight (account timezone).`,
        429,
        "RATE_LIMIT_EXCEEDED",
        [
          {
            errorCode: { rateLimitError: "RESOURCE_EXHAUSTED" },
            message: `Daily limit of ${this.config.maxOperationsPerDay} operations reached`,
          },
        ]
      );
    }

    if (this.state.hourlyOperationCount + operationCount > this.config.maxOperationsPerHour) {
      throw new GoogleAdsApiError(
        `Hourly operation limit exceeded: ${this.state.hourlyOperationCount}/${this.config.maxOperationsPerHour} operations used.`,
        429,
        "RATE_LIMIT_EXCEEDED",
        [
          {
            errorCode: { rateLimitError: "RESOURCE_EXHAUSTED" },
            message: `Hourly limit of ${this.config.maxOperationsPerHour} operations reached`,
          },
        ]
      );
    }

    if (this.state.minuteOperationCount + operationCount > this.config.maxOperationsPerMinute) {
      throw new GoogleAdsApiError(
        `Per-minute operation limit exceeded: ${this.state.minuteOperationCount}/${this.config.maxOperationsPerMinute} operations used.`,
        429,
        "RATE_LIMIT_EXCEEDED",
        [
          {
            errorCode: { rateLimitError: "RESOURCE_EXHAUSTED" },
            message: `Per-minute limit of ${this.config.maxOperationsPerMinute} operations reached`,
          },
        ]
      );
    }

    if (this.concurrentRequests >= this.config.maxConcurrentRequests) {
      throw new GoogleAdsApiError(
        `Concurrent request limit reached: ${this.concurrentRequests}/${this.config.maxConcurrentRequests} active requests.`,
        429,
        "RATE_LIMIT_EXCEEDED",
        [
          {
            errorCode: { rateLimitError: "CONCURRENT_REQUEST_LIMIT" },
            message: `Max ${this.config.maxConcurrentRequests} concurrent requests allowed`,
          },
        ]
      );
    }
  }

  /**
   * Reserve capacity for an operation. Must call `release()` after completion.
   */
  reserve(operationCount: number = 1): void {
    this.state.dailyOperationCount += operationCount;
    this.state.hourlyOperationCount += operationCount;
    this.state.minuteOperationCount += operationCount;
    this.concurrentRequests++;
  }

  /**
   * Release a concurrent request slot.
   */
  release(): void {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
    this.processQueue();
  }

  /**
   * Track a batch of operations (for mutate requests).
   */
  trackOperations(count: number): void {
    this.resetCountersIfNeeded();
    this.state.dailyOperationCount += count;
    this.state.hourlyOperationCount += count;
    this.state.minuteOperationCount += count;
  }

  /** Get current rate limit status */
  getState(): RateLimitState {
    this.resetCountersIfNeeded();
    return {
      ...this.state,
      concurrentRequests: this.concurrentRequests,
    };
  }

  /** Calculate remaining operations for today */
  getRemainingDailyOperations(): number {
    this.resetCountersIfNeeded();
    return Math.max(0, this.config.maxOperationsPerDay - this.state.dailyOperationCount);
  }

  /** Calculate remaining operations for this hour */
  getRemainingHourlyOperations(): number {
    this.resetCountersIfNeeded();
    return Math.max(0, this.config.maxOperationsPerHour - this.state.hourlyOperationCount);
  }

  /** Calculate remaining operations for this minute */
  getRemainingMinuteOperations(): number {
    this.resetCountersIfNeeded();
    return Math.max(0, this.config.maxOperationsPerMinute - this.state.minuteOperationCount);
  }

  /** Reset all counters (useful for testing or manual reset) */
  resetCounters(): void {
    this.state = {
      dailyOperationCount: 0,
      hourlyOperationCount: 0,
      minuteOperationCount: 0,
      concurrentRequests: 0,
      lastResetTime: {
        daily: Date.now(),
        hourly: Date.now(),
        minute: Date.now(),
      },
    };
    this.concurrentRequests = 0;
  }

  private resetCountersIfNeeded(): void {
    const now = Date.now();

    // Reset daily counter (24 hours)
    if (now - this.state.lastResetTime.daily >= 24 * 60 * 60 * 1000) {
      this.state.dailyOperationCount = 0;
      this.state.lastResetTime.daily = now;
    }

    // Reset hourly counter
    if (now - this.state.lastResetTime.hourly >= 60 * 60 * 1000) {
      this.state.hourlyOperationCount = 0;
      this.state.lastResetTime.hourly = now;
    }

    // Reset minute counter
    if (now - this.state.lastResetTime.minute >= 60 * 1000) {
      this.state.minuteOperationCount = 0;
      this.state.lastResetTime.minute = now;
    }
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0) return;
    if (this.concurrentRequests >= this.config.maxConcurrentRequests) return;

    const next = this.requestQueue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Wait until a concurrent request slot is available.
   */
  async waitForSlot(): Promise<void> {
    if (this.concurrentRequests < this.config.maxConcurrentRequests) {
      return;
    }
    return new Promise<void>((resolve) => {
      this.requestQueue.push(resolve);
    });
  }
}

// ---------------------------------------------------------------------------
// Retry Handler
// ---------------------------------------------------------------------------

/**
 * Executes an async function with exponential backoff retry logic.
 * Handles transient errors, rate limits, and partial failures.
 */
export class RetryHandler {
  private config: RetryConfig;
  private rateLimiter: RateLimiter;

  constructor(
    config: Partial<RetryConfig> = {},
    rateLimiter?: RateLimiter
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.rateLimiter = rateLimiter ?? new RateLimiter();
  }

  /**
   * Execute a function with automatic retry on transient failures.
   *
   * @param fn - The async function to execute
   * @param operationName - Human-readable name for logging
   * @returns The result of the function
   *
   * @throws GoogleAdsApiError if all retries are exhausted
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName: string = "google_ads_api_request"
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.config.maxRetries;

        if (!isRetryable || isLastAttempt) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, error);

        console.warn(
          `[GoogleAdsAPI] ${operationName} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}). ` +
            `Retrying in ${delay}ms... Error: ${(error as Error).message}`
        );

        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error(`Unexpected retry exhaustion for ${operationName}`);
  }

  /**
   * Execute multiple operations in sequence with individual retry logic.
   * Handles partial failures by collecting errors and successful results.
   */
  async executeBatch<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    operationName: string = "batch_operation"
  ): Promise<{
    successes: Array<{ item: T; result: R }>;
    failures: Array<{ item: T; error: Error }>;
  }> {
    const successes: Array<{ item: T; result: R }> = [];
    const failures: Array<{ item: T; error: Error }> = [];

    for (const item of items) {
      try {
        const result = await this.execute(() => fn(item), operationName);
        successes.push({ item, result });
      } catch (error) {
        failures.push({ item, error: error as Error });
      }
    }

    return { successes, failures };
  }

  /**
   * Execute multiple operations in parallel with concurrency control.
   * Respects the rate limiter's concurrent request limit.
   */
  async executeParallel<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    operationName: string = "parallel_operation",
    maxConcurrency: number = 5
  ): Promise<{
    successes: Array<{ item: T; result: R }>;
    failures: Array<{ item: T; error: Error }>;
  }> {
    const successes: Array<{ item: T; result: R }> = [];
    const failures: Array<{ item: T; error: Error }> = [];

    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = this.execute(() => fn(item), operationName)
        .then((result) => {
          successes.push({ item, result });
        })
        .catch((error) => {
          failures.push({ item, error: error as Error });
        });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.filter((p) => p !== promise);
      }
    }

    await Promise.all(executing);

    return { successes, failures };
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof GoogleAdsApiError) {
      return error.isRetryable;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const retryablePatterns = [
        "econnreset",
        "etimedout",
        "enotfound",
        "eai_again",
        "socket hang up",
        "network error",
        "timeout",
        "temporary",
        "unavailable",
        "rate limit",
        "too many requests",
        "quota exceeded",
      ];
      return retryablePatterns.some((pattern) => message.includes(pattern));
    }

    return false;
  }

  private calculateDelay(attempt: number, error: unknown): number {
    let baseDelay = this.config.baseDelayMs * Math.pow(this.config.exponentialBase, attempt);

    if (error instanceof GoogleAdsApiError && error.code === 429) {
      baseDelay = Math.max(baseDelay, 5000);
    }

    const jitter = Math.random() * 0.3 * baseDelay;
    return Math.min(baseDelay + jitter, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Error Parser
// ---------------------------------------------------------------------------

/**
 * Parse Google Ads API error responses into structured errors.
 */
export class ErrorParser {
  /**
   * Parse a JSON error response from the Google Ads API.
   */
  static parseErrorResponse(responseBody: unknown, statusCode: number = 500): GoogleAdsApiError {
    if (typeof responseBody !== "object" || responseBody === null) {
      return new GoogleAdsApiError(
        "Unknown error occurred",
        statusCode,
        "UNKNOWN",
        []
      );
    }

    const body = responseBody as GoogleAdsErrorResponse;

    if (!body.error) {
      return new GoogleAdsApiError(
        JSON.stringify(responseBody),
        statusCode,
        "UNKNOWN",
        []
      );
    }

    const details: GoogleAdsErrorDetail[] = [];
    let requestId: string | undefined;

    for (const detail of body.error.details ?? []) {
      if (detail.requestId) {
        requestId = detail.requestId;
      }
      if (detail.errors) {
        details.push(...detail.errors);
      }
    }

    return new GoogleAdsApiError(
      body.error.message || "Google Ads API error",
      body.error.code || statusCode,
      body.error.status || "UNKNOWN",
      details,
      requestId
    );
  }

  /**
   * Parse partial failure from a mutate response.
   * Returns details of failed operations while successful ones are in the results.
   */
  static parsePartialFailure(response: MutateResponse): Array<{
    operationIndex: number;
    error: GoogleAdsApiError;
  }> | null {
    if (!response.partialFailureError) return null;

    const failures: Array<{
      operationIndex: number;
      error: GoogleAdsApiError;
    }> = [];

    try {
      const details = response.partialFailureError.details;
      for (const detail of details) {
        const errorInfo = JSON.parse(
          Buffer.from(detail.value, "base64").toString("utf-8")
        );

        if (errorInfo.errors) {
          for (const err of errorInfo.errors) {
            failures.push({
              operationIndex: err.location?.fieldPathElements?.[0]?.index ?? -1,
              error: new GoogleAdsApiError(
                err.message,
                err.errorCode ? 400 : 500,
                "PARTIAL_FAILURE",
                [err]
              ),
            });
          }
        }
      }
    } catch {
      failures.push({
        operationIndex: -1,
        error: new GoogleAdsApiError(
          response.partialFailureError!.message,
          response.partialFailureError!.code,
          "PARTIAL_FAILURE"
        ),
      });
    }

    return failures;
  }

  /**
   * Parse Fetch API response into a GoogleAdsApiError.
   */
  static async parseHttpResponse(response: Response): Promise<GoogleAdsApiError> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      const text = await response.text();
      body = { error: { message: text, code: response.status, status: response.statusText } };
    }

    return this.parseErrorResponse(body, response.status);
  }
}

// ---------------------------------------------------------------------------
// Utility: Check for partial failure
// ---------------------------------------------------------------------------

/**
 * Check if a mutate response contains partial failures.
 */
export function hasPartialFailure(response: MutateResponse): boolean {
  return !!response.partialFailureError;
}
