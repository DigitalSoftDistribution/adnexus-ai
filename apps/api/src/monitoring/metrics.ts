/**
 * AdNexus AI — Prometheus Metrics
 * Production-grade metrics collection for monitoring, alerting, and observability.
 */

import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from "prom-client";
import { Request, Response, NextFunction } from "express";

// ── Constants ──────────────────────────────────────────────
const NAMESPACE = "adnexus";
const SUBSYSTEM_API = "api";
const SUBSYSTEM_DB = "db";
const SUBSYSTEM_AI = "ai";
const SUBSYSTEM_CACHE = "cache";
const SUBSYSTEM_DRAFT = "draft";
const SUBSYSTEM_PLATFORM = "platform";

// ── Metric Names ───────────────────────────────────────────
export const METRIC_NAMES = {
  HTTP_REQUEST_DURATION: `${NAMESPACE}_${SUBSYSTEM_API}_http_request_duration_seconds`,
  API_CALL_TOTAL: `${NAMESPACE}_${SUBSYSTEM_API}_call_total`,
  ACTIVE_CONNECTIONS: `${NAMESPACE}_${SUBSYSTEM_API}_active_connections`,
  DRAFT_APPROVAL_LATENCY: `${NAMESPACE}_${SUBSYSTEM_DRAFT}_approval_latency_seconds`,
  DRAFT_BACKLOG_SIZE: `${NAMESPACE}_${SUBSYSTEM_DRAFT}_backlog_size`,
  AI_ACTION_DURATION: `${NAMESPACE}_${SUBSYSTEM_AI}_action_duration_seconds`,
  AI_ACTION_ERRORS: `${NAMESPACE}_${SUBSYSTEM_AI}_action_errors_total`,
  DB_QUERY_DURATION: `${NAMESPACE}_${SUBSYSTEM_DB}_query_duration_seconds`,
  DB_CONNECTION_POOL_SIZE: `${NAMESPACE}_${SUBSYSTEM_DB}_connection_pool_size`,
  DB_CONNECTION_POOL_AVAILABLE: `${NAMESPACE}_${SUBSYSTEM_DB}_connection_pool_available`,
  REDIS_HIT_TOTAL: `${NAMESPACE}_${SUBSYSTEM_CACHE}_redis_hit_total`,
  REDIS_MISS_TOTAL: `${NAMESPACE}_${SUBSYSTEM_CACHE}_redis_miss_total`,
  REDIS_HIT_RATIO: `${NAMESPACE}_${SUBSYSTEM_CACHE}_redis_hit_ratio`,
  PLATFORM_RATE_LIMIT_REMAINING: `${NAMESPACE}_${SUBSYSTEM_PLATFORM}_rate_limit_remaining`,
  PLATFORM_RATE_LIMIT_RESET: `${NAMESPACE}_${SUBSYSTEM_PLATFORM}_rate_limit_reset_timestamp`,
  PLATFORM_API_ERRORS: `${NAMESPACE}_${SUBSYSTEM_PLATFORM}_api_errors_total`,
} as const;

// ── Registry ───────────────────────────────────────────────
export const register = new Registry();

// Enable default Node.js metrics (GC, event loop lag, memory, CPU)
collectDefaultMetrics({
  register,
  prefix: `${NAMESPACE}_node_`,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ── HTTP Request Duration Histogram ────────────────────────
export const httpRequestDuration = new Histogram({
  name: METRIC_NAMES.HTTP_REQUEST_DURATION,
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// ── API Call Counter ───────────────────────────────────────
export const apiCallCounter = new Counter({
  name: METRIC_NAMES.API_CALL_TOTAL,
  help: "Total API calls by platform, endpoint, and status",
  labelNames: ["platform", "endpoint", "status", "method"],
  registers: [register],
});

// ── Active Connections Gauge ───────────────────────────────
export const activeConnections = new Gauge({
  name: METRIC_NAMES.ACTIVE_CONNECTIONS,
  help: "Number of currently active HTTP connections",
  labelNames: ["protocol"],
  registers: [register],
});

// ── Draft Approval Latency Histogram ───────────────────────
export const draftApprovalLatency = new Histogram({
  name: METRIC_NAMES.DRAFT_APPROVAL_LATENCY,
  help: "Draft approval latency in seconds (create → approve/reject)",
  labelNames: ["action", "platform", "user_tier"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// ── Draft Backlog Size Gauge ───────────────────────────────
export const draftBacklogSize = new Gauge({
  name: METRIC_NAMES.DRAFT_BACKLOG_SIZE,
  help: "Number of drafts pending approval",
  labelNames: ["platform", "priority", "user_tier"],
  registers: [register],
});

// ── AI Action Execution Time Histogram ─────────────────────
export const aiActionDuration = new Histogram({
  name: METRIC_NAMES.AI_ACTION_DURATION,
  help: "AI action execution time in seconds",
  labelNames: ["action_type", "platform", "model", "status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120],
  registers: [register],
});

// ── AI Action Errors Counter ───────────────────────────────
export const aiActionErrors = new Counter({
  name: METRIC_NAMES.AI_ACTION_ERRORS,
  help: "Total AI action execution errors",
  labelNames: ["action_type", "platform", "model", "error_type"],
  registers: [register],
});

// ── Database Query Duration Histogram ──────────────────────
export const dbQueryDuration = new Histogram({
  name: METRIC_NAMES.DB_QUERY_DURATION,
  help: "Database query duration in seconds",
  labelNames: ["query_type", "table", "operation"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// ── DB Connection Pool Gauges ──────────────────────────────
export const dbConnectionPoolSize = new Gauge({
  name: METRIC_NAMES.DB_CONNECTION_POOL_SIZE,
  help: "Current database connection pool size",
  labelNames: ["database", "role"],
  registers: [register],
});

export const dbConnectionPoolAvailable = new Gauge({
  name: METRIC_NAMES.DB_CONNECTION_POOL_AVAILABLE,
  help: "Available connections in the pool",
  labelNames: ["database", "role"],
  registers: [register],
});

// ── Redis Cache Hit/Miss Counters ──────────────────────────
export const redisHitCounter = new Counter({
  name: METRIC_NAMES.REDIS_HIT_TOTAL,
  help: "Total Redis cache hits",
  labelNames: ["cache_namespace", "key_pattern"],
  registers: [register],
});

export const redisMissCounter = new Counter({
  name: METRIC_NAMES.REDIS_MISS_TOTAL,
  help: "Total Redis cache misses",
  labelNames: ["cache_namespace", "key_pattern"],
  registers: [register],
});

// ── Redis Hit Ratio Gauge ──────────────────────────────────
export const redisHitRatio = new Gauge({
  name: METRIC_NAMES.REDIS_HIT_RATIO,
  help: "Redis cache hit ratio (0-1)",
  labelNames: ["cache_namespace"],
  registers: [register],
});

// ── Platform API Rate Limit Remaining Gauge ────────────────
export const platformRateLimitRemaining = new Gauge({
  name: METRIC_NAMES.PLATFORM_RATE_LIMIT_REMAINING,
  help: "Remaining API rate limit for platform",
  labelNames: ["platform", "endpoint", "tier"],
  registers: [register],
});

export const platformRateLimitReset = new Gauge({
  name: METRIC_NAMES.PLATFORM_RATE_LIMIT_RESET,
  help: "Rate limit reset timestamp (Unix epoch)",
  labelNames: ["platform", "endpoint", "tier"],
  registers: [register],
});

// ── Platform API Errors Counter ────────────────────────────
export const platformApiErrors = new Counter({
  name: METRIC_NAMES.PLATFORM_API_ERRORS,
  help: "Total platform API errors by type",
  labelNames: ["platform", "endpoint", "error_type", "status_code"],
  registers: [register],
});

// ═══════════════════════════════════════════════════════════
// Middleware & Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Express middleware that records HTTP request duration and increments
 * the API call counter. Place this *after* the route handler.
 */
export function metricsMiddleware(
  platformLabel: string = "internal"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const end = process.hrtime.bigint();
      const durationSec = Number(end - start) / 1e9;

      const route = req.route?.path || req.path || "/unknown";
      const method = req.method;
      const statusCode = res.statusCode.toString();

      // Record histogram
      httpRequestDuration
        .labels(method, route, statusCode)
        .observe(durationSec);

      // Increment counter
      apiCallCounter
        .labels(platformLabel, route, statusCode, method)
        .inc();
    });

    next();
  };
}

/**
 * Express middleware that tracks the number of concurrent active connections.
 */
export function activeConnectionsMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const proto = req.secure ? "https" : "http";
    activeConnections.labels(proto).inc();

    res.on("close", () => {
      activeConnections.labels(proto).dec();
    });

    next();
  };
}

/**
 * Measure draft approval latency. Call at approval time with the creation timestamp.
 */
export function recordDraftApprovalLatency(
  action: "approved" | "rejected" | "auto_approved",
  platform: string,
  userTier: string,
  createdAt: Date
): void {
  const elapsedSec = (Date.now() - createdAt.getTime()) / 1000;
  draftApprovalLatency.labels(action, platform, userTier).observe(elapsedSec);
}

/**
 * Update the draft backlog gauge.
 */
export function updateDraftBacklog(
  platform: string,
  priority: string,
  userTier: string,
  count: number
): void {
  draftBacklogSize.labels(platform, priority, userTier).set(count);
}

/**
 * Measure AI action execution time. Use with `withAiTiming()` helper or manually.
 */
export function recordAiActionDuration(
  actionType: string,
  platform: string,
  model: string,
  status: "success" | "error" | "timeout",
  durationSec: number
): void {
  aiActionDuration.labels(actionType, platform, model, status).observe(durationSec);
}

/**
 * Record an AI action error.
 */
export function recordAiActionError(
  actionType: string,
  platform: string,
  model: string,
  errorType: string
): void {
  aiActionErrors.labels(actionType, platform, model, errorType).inc();
}

/**
 * Async helper: execute an AI action and record its timing automatically.
 */
export async function withAiTiming<T>(
  actionType: string,
  platform: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    const end = process.hrtime.bigint();
    recordAiActionDuration(
      actionType,
      platform,
      model,
      "success",
      Number(end - start) / 1e9
    );
    return result;
  } catch (err) {
    const end = process.hrtime.bigint();
    const errorType = err instanceof Error ? err.name : "UnknownError";
    recordAiActionDuration(
      actionType,
      platform,
      model,
      "error",
      Number(end - start) / 1e9
    );
    recordAiActionError(actionType, platform, model, errorType);
    throw err;
  }
}

/**
 * Measure database query duration. Use `withDbTiming()` or call manually.
 */
export function recordDbQueryDuration(
  queryType: string,
  table: string,
  operation: string,
  durationSec: number
): void {
  dbQueryDuration.labels(queryType, table, operation).observe(durationSec);
}

/**
 * Async helper: execute a DB query and record timing automatically.
 */
export async function withDbTiming<T>(
  queryType: string,
  table: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    const end = process.hrtime.bigint();
    recordDbQueryDuration(queryType, table, operation, Number(end - start) / 1e9);
    return result;
  } catch (err) {
    const end = process.hrtime.bigint();
    recordDbQueryDuration(queryType, table, operation, Number(end - start) / 1e9);
    throw err;
  }
}

/**
 * Update DB connection pool metrics.
 */
export function updateDbPoolMetrics(
  database: string,
  role: string,
  totalSize: number,
  available: number
): void {
  dbConnectionPoolSize.labels(database, role).set(totalSize);
  dbConnectionPoolAvailable.labels(database, role).set(available);
}

/**
 * Record a Redis cache hit.
 */
export function recordRedisHit(
  namespace: string,
  keyPattern: string
): void {
  redisHitCounter.labels(namespace, keyPattern).inc();
}

/**
 * Record a Redis cache miss.
 */
export function recordRedisMiss(
  namespace: string,
  keyPattern: string
): void {
  redisMissCounter.labels(namespace, keyPattern).inc();
}

/**
 * Update the Redis hit ratio gauge. Pass total hits and total misses.
 */
export function updateRedisHitRatio(
  namespace: string,
  hits: number,
  misses: number
): void {
  const total = hits + misses;
  const ratio = total > 0 ? hits / total : 0;
  redisHitRatio.labels(namespace).set(ratio);
}

/**
 * Update platform API rate limit metrics from response headers.
 */
export function updatePlatformRateLimit(
  platform: string,
  endpoint: string,
  tier: string,
  remaining: number,
  resetTimestamp: number
): void {
  platformRateLimitRemaining.labels(platform, endpoint, tier).set(remaining);
  platformRateLimitReset.labels(platform, endpoint, tier).set(resetTimestamp);
}

/**
 * Record a platform API error.
 */
export function recordPlatformApiError(
  platform: string,
  endpoint: string,
  errorType: string,
  statusCode: number
): void {
  platformApiErrors.labels(platform, endpoint, errorType, String(statusCode)).inc();
}

/**
 * Expose metrics endpoint for Prometheus scraping.
 * Usage: `app.get("/metrics", exposeMetrics);`
 */
export async function exposeMetrics(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    res.setHeader("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (_err) {
    res.status(500).json({ error: "Failed to collect metrics" });
  }
}
