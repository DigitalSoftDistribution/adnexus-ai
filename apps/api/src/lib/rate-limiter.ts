import Redis from 'ioredis';
import { config } from '../config';

// ─── Rate Limit Tiers ───

const RATE_LIMIT_TIERS: Record<string, { requests: number; windowSeconds: number }> = {
  free: { requests: 100, windowSeconds: 3600 },      // 100/hr
  pro: { requests: 1000, windowSeconds: 3600 },       // 1000/hr
  premium: { requests: 5000, windowSeconds: 3600 },   // 5000/hr
  agency: { requests: 20000, windowSeconds: 3600 },   // 20000/hr
};

// ─── Redis Client ───

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 100, 1000);
      },
    });

    redis.on('error', () => {
      // Silently fall back to in-memory on Redis errors
      redis = null;
    });

    return redis;
  } catch {
    return null;
  }
}

// ─── In-Memory Fallback ───

type MemoryEntry = { timestamps: number[]; resetAt: number };
type ConcurrentEntry = { count: number; acquiredAt: number[] };

const memoryWindows = new Map<string, MemoryEntry>();
const memoryConcurrent = new Map<string, ConcurrentEntry>();

// ─── Helpers ───

function nowMs(): number {
  return Date.now();
}

function getTier(plan: string): { requests: number; windowSeconds: number } {
  return RATE_LIMIT_TIERS[plan] ?? RATE_LIMIT_TIERS.free;
}

function makeKey(workspaceId: string, plan: string): string {
  return `ratelimit:${workspaceId}:${plan}`;
}

function makeBurstKey(workspaceId: string, endpoint: string): string {
  return `ratelimit:${workspaceId}:${endpoint}:burst`;
}

function makeConcurrentKey(workspaceId: string): string {
  return `ratelimit:${workspaceId}:concurrent`;
}

// ─── Sliding Window Implementation ───

export async function checkRateLimit(
  workspaceId: string,
  plan: string,
  endpoint?: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; limit: number }> {
  const tier = getTier(plan);
  const key = makeKey(workspaceId, endpoint ?? plan);
  const windowMs = tier.windowSeconds * 1000;
  const now = nowMs();
  const windowStart = now - windowMs;
  const resetAt = new Date(now + windowMs);

  const client = getRedis();

  if (client) {
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    if (results) {
      const current = (results[1]?.[1] as number) ?? 0;
      const allowed = current < tier.requests;
      const remaining = Math.max(0, tier.requests - current - 1);

      return {
        allowed,
        remaining: allowed ? remaining : 0,
        resetAt,
        limit: tier.requests,
      };
    }
  }

  // ─── In-Memory Fallback ───
  const entry = memoryWindows.get(key);
  if (!entry || now > entry.resetAt) {
    memoryWindows.set(key, { timestamps: [now], resetAt: now + windowMs });
    return { allowed: true, remaining: tier.requests - 1, resetAt, limit: tier.requests };
  }

  // Evict old timestamps
  const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
  validTimestamps.push(now);
  memoryWindows.set(key, { timestamps: validTimestamps, resetAt: entry.resetAt });

  const current = validTimestamps.length - 1; // exclude the one we just added
  const allowed = current < tier.requests;

  return {
    allowed,
    remaining: Math.max(0, tier.requests - current - 1),
    resetAt: new Date(entry.resetAt),
    limit: tier.requests,
  };
}

// ─── Burst Protection ───

export async function checkBurstLimit(
  workspaceId: string,
  endpoint: string,
  maxBurst: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = makeBurstKey(workspaceId, endpoint);
  const windowMs = windowSeconds * 1000;
  const now = nowMs();
  const windowStart = now - windowMs;

  const client = getRedis();

  if (client) {
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    if (results) {
      const current = (results[1]?.[1] as number) ?? 0;
      const allowed = current < maxBurst;
      return {
        allowed,
        remaining: Math.max(0, maxBurst - current - 1),
      };
    }
  }

  // ─── In-Memory Fallback ───
  const entry = memoryWindows.get(key);
  if (!entry || now > entry.resetAt) {
    memoryWindows.set(key, { timestamps: [now], resetAt: now + windowMs });
    return { allowed: true, remaining: maxBurst - 1 };
  }

  const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
  validTimestamps.push(now);
  memoryWindows.set(key, { timestamps: validTimestamps, resetAt: entry.resetAt });

  const current = validTimestamps.length - 1;
  const allowed = current < maxBurst;

  return {
    allowed,
    remaining: Math.max(0, maxBurst - current - 1),
  };
}

// ─── Concurrent Request Limit ───

export async function checkConcurrentLimit(
  workspaceId: string,
  maxConcurrent: number,
): Promise<{ allowed: boolean; current: number }> {
  const key = makeConcurrentKey(workspaceId);
  const client = getRedis();

  if (client) {
    const current = await client.incr(key);
    if (current === 1) {
      await client.pexpire(key, 60_000); // 1 minute TTL
    }

    if (current > maxConcurrent) {
      await client.decr(key);
      return { allowed: false, current: current - 1 };
    }

    return { allowed: true, current };
  }

  // ─── In-Memory Fallback ───
  const entry = memoryConcurrent.get(key);
  if (!entry) {
    memoryConcurrent.set(key, { count: 1, acquiredAt: [nowMs()] });
    return { allowed: true, current: 1 };
  }

  // Clean up stale entries older than 60 seconds
  const now = nowMs();
  const validAcquiredAt = entry.acquiredAt.filter((ts) => now - ts < 60_000);
  const current = validAcquiredAt.length;

  if (current >= maxConcurrent) {
    memoryConcurrent.set(key, { count: current, acquiredAt: validAcquiredAt });
    return { allowed: false, current };
  }

  validAcquiredAt.push(now);
  memoryConcurrent.set(key, { count: validAcquiredAt.length, acquiredAt: validAcquiredAt });

  return { allowed: true, current: validAcquiredAt.length };
}

// ─── Release Concurrent Slot ───

export async function releaseConcurrentSlot(workspaceId: string): Promise<void> {
  const key = makeConcurrentKey(workspaceId);
  const client = getRedis();

  if (client) {
    const current = await client.decr(key);
    if (current < 0) {
      await client.set(key, '0');
    }
    return;
  }

  // ─── In-Memory Fallback ───
  const entry = memoryConcurrent.get(key);
  if (entry) {
    const now = nowMs();
    const validAcquiredAt = entry.acquiredAt.filter((ts) => now - ts < 60_000);
    validAcquiredAt.pop();
    memoryConcurrent.set(key, { count: validAcquiredAt.length, acquiredAt: validAcquiredAt });
  }
}

// ─── Rate Limit Status ───

export async function getRateLimitStatus(
  workspaceId: string,
  plan: string,
): Promise<{
  limit: number;
  remaining: number;
  resetAt: Date;
  window: string;
}> {
  const tier = getTier(plan);
  const key = makeKey(workspaceId, plan);
  const windowMs = tier.windowSeconds * 1000;
  const now = nowMs();
  const windowStart = now - windowMs;

  const client = getRedis();

  if (client) {
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    const results = await pipeline.exec();

    if (results) {
      const current = (results[1]?.[1] as number) ?? 0;
      const ttl = await client.pttl(key);
      return {
        limit: tier.requests,
        remaining: Math.max(0, tier.requests - current),
        resetAt: ttl > 0 ? new Date(now + ttl) : new Date(now + windowMs),
        window: `${tier.windowSeconds}s`,
      };
    }
  }

  // ─── In-Memory Fallback ───
  const entry = memoryWindows.get(key);
  if (!entry || now > entry.resetAt) {
    return {
      limit: tier.requests,
      remaining: tier.requests,
      resetAt: new Date(now + windowMs),
      window: `${tier.windowSeconds}s`,
    };
  }

  const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
  return {
    limit: tier.requests,
    remaining: Math.max(0, tier.requests - validTimestamps.length),
    resetAt: new Date(entry.resetAt),
    window: `${tier.windowSeconds}s`,
  };
}

// ─── Periodic Cleanup ───

function cleanupExpiredEntries(): void {
  const now = nowMs();

  for (const [key, entry] of memoryWindows) {
    if (now > entry.resetAt) {
      memoryWindows.delete(key);
    }
  }

  for (const [key, entry] of memoryConcurrent) {
    const validAcquiredAt = entry.acquiredAt.filter((ts) => now - ts < 60_000);
    if (validAcquiredAt.length === 0) {
      memoryConcurrent.delete(key);
    } else {
      memoryConcurrent.set(key, { count: validAcquiredAt.length, acquiredAt: validAcquiredAt });
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupExpiredEntries, 60_000);

// ─── Graceful Shutdown ───

export async function disconnectRateLimiter(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
  memoryWindows.clear();
  memoryConcurrent.clear();
}
