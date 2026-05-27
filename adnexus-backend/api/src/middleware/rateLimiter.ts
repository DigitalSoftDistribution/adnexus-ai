import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './errorHandler';
import { RateLimitError } from '../lib/errors';
import { getRedisClient, isRedisAvailable } from '../lib/redis';
import { getRequestLogger } from '../lib/logger';
import { config } from '../config';

// ─── Types ───────────────────────────────────────────────────

export type RateLimitTier = 'authenticated' | 'unauthenticated' | 'webhook';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

// ─── Configuration ───────────────────────────────────────────

/** Rate limits per tier: requests per minute */
const TIER_LIMITS: Record<RateLimitTier, { requests: number; windowMs: number }> = {
  authenticated: {
    requests: config.rateLimit.authenticatedPerMinute,
    windowMs: 60_000, // 1 minute
  },
  unauthenticated: {
    requests: config.rateLimit.unauthenticatedPerMinute,
    windowMs: 60_000,
  },
  webhook: {
    requests: config.rateLimit.webhookPerMinute,
    windowMs: 60_000,
  },
};

/** Routes to skip rate limiting */
const SKIP_RATE_LIMIT_PATHS = ['/health', '/ready', '/live', '/metrics'];

// ─── In-Memory Fallback ──────────────────────────────────────

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60_000);

// ─── Helpers ─────────────────────────────────────────────────

function shouldSkipRateLimit(req: Request): boolean {
  const path = req.path ?? req.url;
  return SKIP_RATE_LIMIT_PATHS.some((skip) => path === skip || path.endsWith(skip));
}

function getClientIdentifier(req: Request, tier: RateLimitTier): string {
  if (tier === 'authenticated' && req.user?.sub) {
    return `ratelimit:auth:${req.user.sub}`;
  }
  if (tier === 'webhook') {
    // Webhooks identified by a combination of path + IP/workspace
    const wsId = req.workspaceId ?? 'global';
    return `ratelimit:wh:${wsId}:${req.path}`;
  }
  // Unauthenticated users identified by IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0]?.trim()
    : req.socket?.remoteAddress ?? req.ip ?? 'unknown';
  return `ratelimit:ip:${ip}`;
}

function setRateLimitHeaders(
  res: Response,
  result: RateLimitResult,
): void {
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt.getTime() / 1000)));

  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.max(1, result.retryAfterSeconds)));
  }
}

// ─── Core Rate Limit Check ───────────────────────────────────

async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier,
): Promise<RateLimitResult> {
  const tierConfig = TIER_LIMITS[tier];
  const now = Date.now();
  const windowStart = now - tierConfig.windowMs;
  const resetAt = new Date(now + tierConfig.windowMs);

  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    try {
      // Use Redis for distributed rate limiting
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(identifier, 0, windowStart);
      pipeline.zcard(identifier);
      pipeline.zadd(identifier, now, `${now}-${Math.random().toString(36).slice(2)}`);
      pipeline.pexpire(identifier, tierConfig.windowMs);
      const results = await pipeline.exec();

      if (results) {
        const current = (results[1]?.[1] as number) ?? 0;
        const allowed = current < tierConfig.requests;
        const remaining = Math.max(0, tierConfig.requests - current - 1);
        const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000);

        return {
          allowed,
          limit: tierConfig.requests,
          remaining: allowed ? remaining : 0,
          resetAt,
          retryAfterSeconds,
        };
      }
    } catch {
      // Fall through to in-memory if Redis fails
    }
  }

  // ─── In-Memory Fallback ───────────────────────────────────

  const entry = memoryStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + tierConfig.windowMs });
    return {
      allowed: true,
      limit: tierConfig.requests,
      remaining: tierConfig.requests - 1,
      resetAt: new Date(now + tierConfig.windowMs),
      retryAfterSeconds: Math.ceil(tierConfig.windowMs / 1000),
    };
  }

  const newCount = entry.count + 1;
  const allowed = entry.count < tierConfig.requests;

  if (allowed) {
    memoryStore.set(identifier, { count: newCount, resetAt: entry.resetAt });
  }

  return {
    allowed,
    limit: tierConfig.requests,
    remaining: Math.max(0, tierConfig.requests - newCount),
    resetAt: new Date(entry.resetAt),
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// ─── Middleware Factory ──────────────────────────────────────

/**
 * Create a rate limiting middleware for a specific tier.
 *
 * Tiers:
 * - 'authenticated': 100 req/min per user (configurable via RATE_LIMIT_AUTHENTICATED)
 * - 'unauthenticated': 20 req/min per IP (configurable via RATE_LIMIT_UNAUTHENTICATED)
 * - 'webhook': 200 req/min per workspace endpoint (configurable via RATE_LIMIT_WEBHOOK)
 *
 * Skips rate limiting for health check endpoints.
 * Returns 429 with Retry-After header when limit exceeded.
 *
 * @param tier - The rate limit tier to apply
 *
 * @example
 * app.use('/api/v1/', createRateLimiter('authenticated'));
 * app.use('/webhooks/', createRateLimiter('webhook'));
 * app.use(createRateLimiter('unauthenticated')); // for all unauthenticated routes
 */
export function createRateLimiter(tier: RateLimitTier) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Skip health checks
    if (shouldSkipRateLimit(req)) {
      next();
      return;
    }

    const identifier = getClientIdentifier(req, tier);
    const result = await checkRateLimit(identifier, tier);

    // Set rate limit headers on all responses
    setRateLimitHeaders(res, result);

    if (!result.allowed) {
      const correlationId = req.requestId ?? 'unknown';
      const logger = getRequestLogger(correlationId);
      logger.warn(
        {
          tier,
          identifier: identifier.split(':').slice(0, 2).join(':') + ':<masked>',
          limit: result.limit,
        },
        `Rate limit exceeded (${tier})`,
      );

      throw new RateLimitError(
        `Rate limit exceeded. Limit: ${result.limit} requests per minute. ` +
        `Retry after ${result.retryAfterSeconds}s.`,
      );
    }

    next();
  });
}

// ─── Pre-configured Middleware Instances ─────────────────────

/** Rate limiter for authenticated users (100 req/min default) */
export const authenticatedRateLimiter = createRateLimiter('authenticated');

/** Rate limiter for unauthenticated users (20 req/min default) */
export const unauthenticatedRateLimiter = createRateLimiter('unauthenticated');

/** Rate limiter for webhook endpoints (200 req/min default) */
export const webhookRateLimiter = createRateLimiter('webhook');
