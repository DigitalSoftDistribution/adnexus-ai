import { getRedisClient, isRedisAvailable } from '../lib/redis';
import type { UnifiedCampaign, Draft } from '../types';
import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('cache-service');

// ─── Cache Local Types ───────────────────────────────────────

export interface CampaignInsights {
  campaign_id: string;
  workspace_id: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
  cpm: number;
  cpc: number;
  cost_per_conversion: number;
  conversion_rate: number;
  platform_data: Record<string, unknown>;
  fetched_at: string;
}

export interface AccountOverview {
  workspace_id: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_cpa: number;
  avg_roas: number;
  platform_breakdown: Array<{
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roas: number;
  }>;
  active_campaigns: number;
  paused_campaigns: number;
  drafted_campaigns: number;
  fetched_at: string;
}

export interface UserSession {
  user_id: string;
  email: string;
  name: string;
  workspace_id: string;
  role: string;
  avatar_url?: string;
  permissions: string[];
  logged_in_at: string;
}

// ─── Default TTLs (seconds) ──────────────────────────────────

const DEFAULT_TTL = {
  campaigns: 300,       // 5 minutes
  insights: 600,        // 10 minutes
  accountOverview: 60,  // 1 minute
  drafts: 300,          // 5 minutes
  session: 1800,        // 30 minutes
  rateLimit: 60,        // 1 minute
  notifications: 300,   // 5 minutes
} as const;

// ─── Key Builders ────────────────────────────────────────────

function campaignKey(workspaceId: string): string {
  return `campaigns:${workspaceId}`;
}

function insightKey(workspaceId: string, campaignId: string): string {
  return `insights:${workspaceId}:${campaignId}`;
}

function accountKey(workspaceId: string): string {
  return `account:${workspaceId}`;
}

function draftKey(workspaceId: string, status: string): string {
  return `drafts:${workspaceId}:${status}`;
}

function sessionKey(userId: string): string {
  return `session:${userId}`;
}

function rateLimitKey(workspaceId: string, endpoint: string): string {
  return `ratelimit:${workspaceId}:${endpoint}`;
}

function notificationKey(workspaceId: string, userId: string): string {
  return `notifications:${workspaceId}:${userId}`;
}

// ─── Serialization Helpers ───────────────────────────────────

function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

function deserialize<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Generic Cache Operations ────────────────────────────────

export async function get<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return null;

  try {
    const raw = await redis.get(key);
    return deserialize<T>(raw);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache GET error (key prefix: ${key.split(':', 1)[0]})`);
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return;

  try {
    const payload = serialize(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache SET error (key prefix: ${key.split(':', 1)[0]})`);
  }
}

export async function del(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return;

  try {
    await redis.del(key);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache DEL error (key prefix: ${key.split(':', 1)[0]})`);
  }
}

export async function delPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return;

  try {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache DEL pattern error (prefix: ${pattern.split(':', 1)[0]})`);
  }
}

export async function exists(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return false;

  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache EXISTS error (key prefix: ${key.split(':', 1)[0]})`);
    return false;
  }
}

export async function ttl(key: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return -2;

  try {
    return await redis.ttl(key);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache TTL error (key prefix: ${key.split(':', 1)[0]})`);
    return -2;
  }
}

// ─── Campaign Cache ──────────────────────────────────────────

export async function cacheCampaigns(
  workspaceId: string,
  campaigns: UnifiedCampaign[],
  ttl?: number,
): Promise<void> {
  await set(campaignKey(workspaceId), campaigns, ttl ?? DEFAULT_TTL.campaigns);
}

export async function getCachedCampaigns(
  workspaceId: string,
): Promise<UnifiedCampaign[] | null> {
  return get<UnifiedCampaign[]>(campaignKey(workspaceId));
}

export async function invalidateCampaigns(workspaceId: string): Promise<void> {
  await del(campaignKey(workspaceId));
}

// ─── Insights Cache ──────────────────────────────────────────

export async function cacheInsights(
  workspaceId: string,
  campaignId: string,
  insights: CampaignInsights,
  ttl?: number,
): Promise<void> {
  await set(insightKey(workspaceId, campaignId), insights, ttl ?? DEFAULT_TTL.insights);
}

export async function getCachedInsights(
  workspaceId: string,
  campaignId: string,
): Promise<CampaignInsights | null> {
  return get<CampaignInsights>(insightKey(workspaceId, campaignId));
}

export async function invalidateInsights(
  workspaceId: string,
  campaignId?: string,
): Promise<void> {
  if (campaignId) {
    await del(insightKey(workspaceId, campaignId));
  } else {
    await delPattern(`insights:${workspaceId}:*`);
  }
}

// ─── Account Overview Cache ──────────────────────────────────

export async function cacheAccountOverview(
  workspaceId: string,
  overview: AccountOverview,
  ttl?: number,
): Promise<void> {
  await set(accountKey(workspaceId), overview, ttl ?? DEFAULT_TTL.accountOverview);
}

export async function getCachedAccountOverview(
  workspaceId: string,
): Promise<AccountOverview | null> {
  return get<AccountOverview>(accountKey(workspaceId));
}

// ─── Drafts Cache ────────────────────────────────────────────

export async function cacheDrafts(
  workspaceId: string,
  status: string,
  drafts: Draft[],
  ttl?: number,
): Promise<void> {
  await set(draftKey(workspaceId, status), drafts, ttl ?? DEFAULT_TTL.drafts);
}

export async function getCachedDrafts(
  workspaceId: string,
  status: string,
): Promise<Draft[] | null> {
  return get<Draft[]>(draftKey(workspaceId, status));
}

export async function invalidateDrafts(workspaceId: string): Promise<void> {
  await delPattern(`drafts:${workspaceId}:*`);
}

// ─── User Session Cache ──────────────────────────────────────

export async function cacheUserSession(
  userId: string,
  sessionData: UserSession,
  ttl?: number,
): Promise<void> {
  await set(sessionKey(userId), sessionData, ttl ?? DEFAULT_TTL.session);
}

export async function getCachedUserSession(
  userId: string,
): Promise<UserSession | null> {
  return get<UserSession>(sessionKey(userId));
}

export async function invalidateUserSession(userId: string): Promise<void> {
  await del(sessionKey(userId));
}

// ─── Rate Limit Cache ────────────────────────────────────────

export async function incrementCounter(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return 1;

  try {
    const multiResult = await redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec();

    if (multiResult) {
      const firstResult = multiResult[0];
      if (firstResult && !Array.isArray(firstResult[1])) {
        return (firstResult[1] as number) ?? 1;
      }
    }
    return 1;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache INCR error (key prefix: ${key.split(':', 1)[0]})`);
    return 1;
  }
}

export async function getCounter(key: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return 0;

  try {
    const raw = await redis.get(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, `Cache GET counter error (key prefix: ${key.split(':', 1)[0]})`);
    return 0;
  }
}

// ─── Notification Cache ──────────────────────────────────────

export async function cacheNotifications<T>(
  workspaceId: string,
  userId: string,
  notifications: T[],
  ttl?: number,
): Promise<void> {
  await set(notificationKey(workspaceId, userId), notifications, ttl ?? DEFAULT_TTL.notifications);
}

export async function getCachedNotifications<T>(
  workspaceId: string,
  userId: string,
): Promise<T[] | null> {
  return get<T[]>(notificationKey(workspaceId, userId));
}

export async function invalidateNotifications(
  workspaceId: string,
  userId?: string,
): Promise<void> {
  if (userId) {
    await del(notificationKey(workspaceId, userId));
  } else {
    await delPattern(`notifications:${workspaceId}:*`);
  }
}
