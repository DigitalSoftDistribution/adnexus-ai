/**
 * Token-Bucket Rate Limiter
 * =========================
 * Enforces TikTok's 50 QPS limit per app per advertiser.
 * Thread-safe via async queue + token bucket algorithm.
 */

import { TokenBucketState } from "./types";

export class TokenBucketRateLimiter {
  private state: TokenBucketState;
  private readonly queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(capacity: number, refillRatePerSecond: number) {
    this.state = {
      tokens: capacity,
      lastRefill: Date.now(),
      capacity,
      refillRate: refillRatePerSecond / 1000, // tokens per ms
    };
  }

  /**
   * Acquire permission to make a request.
   * Resolves immediately if tokens available; otherwise queues.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.state.tokens >= 1) {
      this.state.tokens -= 1;
      return;
    }

    // Compute wait time for next token
    const waitMs = Math.ceil(1 / this.state.refillRate);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.dequeue(resolve, reject);
      }, waitMs);
      this.queue.push({ resolve, reject, timer });
    });
  }

  /**
   * Try to acquire without blocking. Returns true if token was consumed.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.state.tokens >= 1) {
      this.state.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Release a token back to the bucket (e.g., after a rate-limit response).
   */
  release(): void {
    this.state.tokens = Math.min(this.state.tokens + 1, this.state.capacity);
    this.processQueue();
  }

  /** Current token count (for monitoring). */
  getTokens(): number {
    this.refill();
    return this.state.tokens;
  }

  /** Pending waiters (for monitoring). */
  getQueueDepth(): number {
    return this.queue.length;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.state.lastRefill;
    if (elapsed <= 0) return;

    const tokensToAdd = elapsed * this.state.refillRate;
    this.state.tokens = Math.min(this.state.tokens + tokensToAdd, this.state.capacity);
    this.state.lastRefill = now;
  }

  private dequeue(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    // Remove from queue
    const idx = this.queue.findIndex((w) => w.resolve === resolve);
    if (idx !== -1) {
      clearTimeout(this.queue[idx].timer);
      this.queue.splice(idx, 1);
    }

    this.refill();
    if (this.state.tokens >= 1) {
      this.state.tokens -= 1;
      resolve();
    } else {
      // Still no token — re-queue with new wait
      const waitMs = Math.ceil(1 / this.state.refillRate);
      const timer = setTimeout(() => {
        this.dequeue(resolve, reject);
      }, waitMs);
      this.queue.push({ resolve, reject, timer });
    }
  }

  private processQueue(): void {
    this.refill();
    while (this.queue.length > 0 && this.state.tokens >= 1) {
      const waiter = this.queue.shift()!;
      clearTimeout(waiter.timer);
      this.state.tokens -= 1;
      waiter.resolve();
    }
  }

  /** Drain all pending waiters with an error (useful during shutdown). */
  drain(errorMessage = "Rate limiter shut down"): void {
    while (this.queue.length > 0) {
      const waiter = this.queue.shift()!;
      clearTimeout(waiter.timer);
      waiter.reject(new Error(errorMessage));
    }
  }
}
