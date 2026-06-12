/**
 * AdNexus AI — Health Check Endpoints
 * Kubernetes-friendly liveness, readiness, and detailed health probes.
 */

import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { Redis } from "ioredis";
import axios from "axios";
import { getModuleLogger } from "../lib/logger";

const logger = getModuleLogger("health");

// ── Types ──────────────────────────────────────────────────

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: DependencyCheck[];
}

export interface DependencyCheck {
  name: string;
  status: "up" | "down" | "degraded" | "unknown";
  responseTimeMs: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthConfig {
  /** Application semantic version */
  version: string;
  /** PostgreSQL connection pool */
  dbPool: Pool;
  /** Redis client */
  redis: Redis;
  /** External API health endpoints to check */
  externalApis?: ExternalApiCheck[];
  /** Timeout for each dependency check in ms */
  checkTimeoutMs?: number;
  /** Start timestamp for uptime calculation */
  startedAt?: Date;
}

export interface ExternalApiCheck {
  name: string;
  url: string;
  method?: "GET" | "HEAD";
  expectedStatus?: number;
  headers?: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────

const DEFAULT_CHECK_TIMEOUT_MS = 5000;
const HEALTHY_RESPONSE_TIME_MS = 500;
const DEGRADED_RESPONSE_TIME_MS = 2000;

// ── Helper: timed check wrapper ────────────────────────────

async function timedCheck(
  name: string,
  fn: () => Promise<Record<string, unknown> | void>,
  timeoutMs: number
): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Check timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
    const elapsed = Date.now() - start;
    let status: DependencyCheck["status"] = "up";
    if (elapsed > DEGRADED_RESPONSE_TIME_MS) status = "degraded";
    else if (elapsed > HEALTHY_RESPONSE_TIME_MS) status = "degraded";

    return {
      name,
      status,
      responseTimeMs: elapsed,
      metadata: result || undefined,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      name,
      status: "down",
      responseTimeMs: elapsed,
      message,
    };
  }
}

// ── Dependency checkers ────────────────────────────────────

async function checkPostgres(
  pool: Pool,
  timeoutMs: number
): Promise<DependencyCheck> {
  return timedCheck("postgresql", async () => {
    const client = await pool.connect();
    try {
      const start = Date.now();
      const result = await client.query<{ now: Date }>("SELECT NOW() as now");
      const activeConnections = await client.query<{ count: string }>(
        "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
      );
      const maxConnections = await client.query<{ setting: string }>(
        "SELECT setting FROM pg_settings WHERE name = 'max_connections'"
      );

      return {
        queryTimeMs: Date.now() - start,
        activeConnections: parseInt(activeConnections.rows[0].count, 10),
        maxConnections: parseInt(maxConnections.rows[0].setting, 10),
        serverTime: result.rows[0].now,
      };
    } finally {
      client.release();
    }
  }, timeoutMs);
}

async function checkRedis(
  redis: Redis,
  timeoutMs: number
): Promise<DependencyCheck> {
  return timedCheck("redis", async () => {
    const start = Date.now();
    const pong = await redis.ping();
    const info = await redis.info("server");
    const memory = await redis.info("memory");

    const versionMatch = info.match(/redis_version:(.+)/);
    const usedMemoryMatch = memory.match(/used_memory_human:(.+)/);

    return {
      pingResponse: pong,
      responseTimeMs: Date.now() - start,
      version: versionMatch?.[1]?.trim() || "unknown",
      memoryUsed: usedMemoryMatch?.[1]?.trim() || "unknown",
      connectedClients: parseInt(
        (await redis.info("clients")).match(/connected_clients:(\d+)/)?.[1] || "0",
        10
      ),
    };
  }, timeoutMs);
}

async function checkExternalApi(
  api: ExternalApiCheck,
  timeoutMs: number
): Promise<DependencyCheck> {
  return timedCheck(api.name, async () => {
    const response = await axios({
      method: api.method || "HEAD",
      url: api.url,
      headers: api.headers,
      timeout: timeoutMs,
      validateStatus: () => true, // Don't throw on non-2xx
    });

    const expectedStatus = api.expectedStatus || 200;
    if (response.status !== expectedStatus) {
      throw new Error(`Unexpected status ${response.status}, expected ${expectedStatus}`);
    }

    return {
      statusCode: response.status,
      responseHeaders: response.headers,
    };
  }, timeoutMs);
}

// ── Router factory ─────────────────────────────────────────

export function createHealthRouter(config: HealthConfig): Router {
  const router = Router();
  const {
    version,
    dbPool,
    redis,
    externalApis = [],
    checkTimeoutMs = DEFAULT_CHECK_TIMEOUT_MS,
    startedAt = new Date(),
  } = config;

  // ── GET /health ─ Liveness probe ─────────────────────────
  router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // ── GET /ready ─ Readiness probe ─────────────────────────
  router.get("/ready", async (_req: Request, res: Response) => {
    const checks = await Promise.all([
      checkPostgres(dbPool, checkTimeoutMs),
      checkRedis(redis, checkTimeoutMs),
    ]);

    const allUp = checks.every((c) => c.status === "up");
    const anyDown = checks.some((c) => c.status === "down");

    const status = anyDown ? "unhealthy" : allUp ? "healthy" : "degraded";
    const statusCode = anyDown ? 503 : allUp ? 200 : 200;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      checks,
    });
  });

  // ── GET /health/detailed ─ Detailed health check ─────────
  router.get("/health/detailed", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    // Require bearer token for detailed endpoint in production
    if (process.env.NODE_ENV === "production") {
      const expectedToken = process.env.HEALTH_CHECK_TOKEN;
      if (
        !expectedToken ||
        !authHeader ||
        authHeader.replace("Bearer ", "") !== expectedToken
      ) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const baseChecks = [
      checkPostgres(dbPool, checkTimeoutMs),
      checkRedis(redis, checkTimeoutMs),
    ];

    const apiChecks = externalApis.map((api) =>
      checkExternalApi(api, checkTimeoutMs)
    );

    const checks = await Promise.all([...baseChecks, ...apiChecks]);

    const anyDown = checks.some((c) => c.status === "down");
    const anyDegraded = checks.some((c) => c.status === "degraded");

    let overallStatus: HealthStatus["status"] = "healthy";
    if (anyDown) overallStatus = "unhealthy";
    else if (anyDegraded) overallStatus = "degraded";

    const statusCode = anyDown ? 503 : 200;

    const status: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      checks,
    };

    res.status(statusCode).json(status);
  });

  return router;
}

// ── Graceful shutdown helper ───────────────────────────────

export async function gracefulShutdown(
  dbPool: Pool,
  redis: Redis,
  server?: { close: (cb?: () => void) => void },
  timeoutMs: number = 30000
): Promise<void> {
  logger.info("Starting graceful shutdown...");

  const shutdownPromise = new Promise<void>((resolve) => {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed");
      });
    }

    // Close database connections
    dbPool
      .end()
      .then(() => logger.info("Database pool drained"))
      .catch((err) => logger.error({ err }, "DB pool drain error"))
      .finally(() => {
        // Disconnect Redis
        redis
          .quit()
          .then(() => logger.info("Redis disconnected"))
          .catch((err) => logger.error({ err }, "Redis disconnect error"))
          .finally(resolve);
      });
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Shutdown timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  );

  try {
    await Promise.race([shutdownPromise, timeoutPromise]);
    logger.info("Graceful shutdown complete");
  } catch (err) {
    logger.error({ err }, "Graceful shutdown failed");
    process.exit(1);
  }
}
