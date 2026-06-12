/**
 * AdNexus AI — Express Application Entry Point
 * ==============================================
 * Production-ready main server file that wires together all middleware,
 * routes, real-time services, health checks, and graceful shutdown.
 *
 * Architecture:
 *   Security (helmet, cors) → Body parsing → Request logging → Rate limiting
 *   → Health/Metrics (unauthenticated) → Public routes → Auth middleware
 *   → Authenticated routes → SSE endpoint → 404 handler → Error handler
 *
 * Authentication:
 *   - `authenticateToken` — local JWT verification (fast, stateless)
 *   - `authenticate` — Supabase round-trip verification (authoritative)
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, isDevelopment, isProduction, isAllowedCorsOrigin } from './config';
import { logger, getModuleLogger } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import {
  authenticatedRateLimiter,
  unauthenticatedRateLimiter,
  webhookRateLimiter,
} from './middleware/rateLimiter';
import { validateEncryptionEnv } from './security/encryption';
import { authenticate } from './middleware/authenticate';
import { authenticateToken, requireAdmin } from './middleware/auth';
import { requireResourceAccess } from './middleware/scopeCheck';
import { errorHandler } from './middleware/errorHandler';
import { supabase } from './lib/supabase';
import { isRedisAvailable, closeRedis } from './lib/redis';
import { register, getMetrics } from './lib/monitoring';

// ─── Route imports ───────────────────────────────────────────

import authRoutes from './routes/auth';
import metaOAuthRoutes from './routes/auth/meta';
import googleOAuthRoutes from './routes/auth/google';
import tiktokOAuthRoutes from './routes/auth/tiktok';
import snapOAuthRoutes from './routes/auth/snap';
import campaignRoutes from './routes/campaigns';
import adRoutes from './routes/ads';
import draftRoutes from './routes/drafts';
import agentRoutes from './routes/agent';
import reportRoutes from './routes/reports';
import audienceRoutes from './routes/audiences';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
import webhookRoutes from './routes/webhooks';
import billingRoutes from './routes/billing';
import goalRoutes from './routes/goals';
import exportRoutes from './routes/exports';
import searchRoutes from './routes/search';
import ragRoutes from './routes/rag';
import webhooksConfigRoutes from './routes/webhooks-config';
import auditLogRoutes from './routes/audit-log';
import adminRoutes from './routes/admin';
import apiKeyRoutes from './routes/api-keys';
import publicAuditRoutes from './routes/public-audit';
import commentRoutes from './routes/comments';
import uploadRoutes from './routes/upload';
import alertRoutes from './routes/alerts';

// ─── V2 Clean Architecture (runtime mount) ───────────────────

import { mountV2Routes } from './interface/http/mountV2';

// ─── Real-time ───────────────────────────────────────────────

import { createRealtimeService } from './realtime';

// ─── Application Setup ───────────────────────────────────────

const app = express();
const loggerApp = getModuleLogger('app');
const rt = createRealtimeService();

// ─── Security Middleware ─────────────────────────────────────

/**
 * Helmet secures HTTP headers:
 *   - HSTS, X-Frame-Options, X-Content-Type-Options, etc.
 *   - CSP is disabled in dev to avoid frontend issues; enabled in prod.
 *   - COEP only in prod for cross-origin isolation.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{RANDOM}'"],
        styleSrc: ["'self'", "'nonce-{RANDOM}'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: isProduction,
  }),
);

/** CORS — strict origin checking in production, permissive in dev. */
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (e.g., curl, mobile apps, health probes)
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowedOrigins = config.cors.origin;
    if (isAllowedCorsOrigin(origin, allowedOrigins) || isDevelopment) {
      callback(null, true);
    } else {
      loggerApp.warn({ origin }, 'CORS blocked request from disallowed origin');
      callback(null, false);
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Workspace-Id',
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Body Parsing ────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS — Separate rate limits, raw body where needed
// ═══════════════════════════════════════════════════════════════

/** Stripe billing webhook — mounted before JSON parsing so signature verification receives the raw body. */
app.post(
  '/api/v1/billing/webhook',
  unauthenticatedRateLimiter,
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.url = '/webhook';
    billingRoutes(req, res, next);
  },
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logging (with correlation ID) ──────────────────

app.use(requestLogger);

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS — No authentication required
// ═══════════════════════════════════════════════════════════════

// ─── Health & Observability ──────────────────────────────────

/** Liveness probe — Kubernetes / load balancer checks */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

/**
 * Readiness probe — verifies DB and optional Redis are reachable.
 * Returns 503 if critical dependencies are down.
 */
app.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error' | 'not_configured'> = {};
  let dbOk = false;

  try {
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    if (!error) {
      checks.db = 'ok';
      dbOk = true;
    } else {
      checks.db = 'error';
    }
  } catch {
    checks.db = 'error';
  }

  if (config.redis.url) {
    checks.redis = isRedisAvailable() ? 'ok' : 'error';
  } else {
    checks.redis = 'not_configured';
  }

  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ready' : 'not_ready', checks });
});

/** Prometheus metrics endpoint for monitoring & alerting */
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await getMetrics());
  } catch {
    res.status(500).end('Failed to collect metrics');
  }
});

// ─── Public Routes (unauthenticated rate limiting) ───────────

app.use('/api/v1/auth', unauthenticatedRateLimiter, authRoutes);

// OAuth routes: callbacks remain public; connect/disconnect handlers authenticate internally.
app.use('/api/v1/auth/meta', unauthenticatedRateLimiter, metaOAuthRoutes);

app.use('/api/v1/auth/google', unauthenticatedRateLimiter, googleOAuthRoutes);

app.use('/api/v1/auth/tiktok', unauthenticatedRateLimiter, tiktokOAuthRoutes);

app.use('/api/v1/auth/snap', unauthenticatedRateLimiter, snapOAuthRoutes);

// ─── Free Public Audit (no auth required — GTM wedge) ────────

app.use('/api/v1/public', unauthenticatedRateLimiter, publicAuditRoutes);


/** External platform webhooks */
app.use('/api/v1/webhooks', webhookRateLimiter, webhookRoutes);

// ═══════════════════════════════════════════════════════════════
// V2 CLEAN ARCHITECTURE ROUTES (/api/v2/*)
// ═══════════════════════════════════════════════════════════════
//
// Mounted BEFORE the global `authenticateToken` gate below: the v2 routes
// carry their own JWT auth (`requireAuth`) + RBAC (`requireRole`) and the
// `/api/v2/auth` group must stay public. The live Next.js dashboard rewrites
// `/api/v2/*` to this API (apps/web/next.config.ts), so these routes back the
// dashboard's campaign summary, lists, drafts, etc.
mountV2Routes(app);

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED API ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * All routes below this point require a valid JWT.
 *
 * Two auth strategies are available:
 *   1. `authenticateToken` — local JWT verification (fast, stateless).
 *      Used for high-throughput API routes.
 *   2. `authenticate` — Supabase round-trip verification (authoritative).
 *      Used where the freshest user state is required (e.g., SSE).
 */

// Apply local JWT auth + authenticated rate limiting to all API routes
app.use(authenticateToken);
app.use(authenticatedRateLimiter);

// ─── Core API v1 Routes ──────────────────────────────────────

app.use('/api/v1/campaigns', requireResourceAccess('campaigns'), campaignRoutes);
app.use('/api/v1/ads', requireResourceAccess('ads'), adRoutes);
app.use('/api/v1/drafts', requireResourceAccess('drafts'), draftRoutes);
app.use('/api/v1/agent', requireResourceAccess('agent'), agentRoutes);
app.use('/api/v1/reports', requireResourceAccess('reports'), reportRoutes);
app.use('/api/v1/audiences', requireResourceAccess('audiences'), audienceRoutes);
app.use('/api/v1/settings', requireResourceAccess('settings'), settingsRoutes);
app.use('/api/v1/notifications', requireResourceAccess('notifications'), notificationRoutes);
app.use('/api/v1/billing', requireResourceAccess('billing'), billingRoutes);
app.use('/api/v1/goals', requireResourceAccess('goals'), goalRoutes);
app.use('/api/v1/exports', requireResourceAccess('exports'), exportRoutes);
app.use('/api/v1/search', requireResourceAccess('search'), searchRoutes);
app.use('/api/v1/rag', requireResourceAccess('rag'), ragRoutes);
app.use('/api/v1/webhooks', requireResourceAccess('webhooks'), webhooksConfigRoutes);
app.use('/api/v1/audit-log', requireResourceAccess('audit-log'), auditLogRoutes);
app.use('/api/v1/admin', requireResourceAccess('settings'), adminRoutes);
app.use('/api/v1/api-keys', requireAdmin, apiKeyRoutes);
app.use('/api/v1/comments', requireResourceAccess('comments'), commentRoutes);
app.use('/api/v1/upload', requireResourceAccess('exports'), uploadRoutes);
app.use('/api/v1/alerts', requireResourceAccess('alerts'), alertRoutes);

// ─── Real-Time: SSE Endpoint ─────────────────────────────────

/**
 * Server-Sent Events endpoint for live dashboard updates.
 * Uses `authenticate` (Supabase verification) for the freshest
 * user state since SSE connections are long-lived.
 */
app.get('/api/v1/events', authenticate, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }
  rt.sse.subscribe(req.user.sub, req.user.workspace_id, res);
});

// ═══════════════════════════════════════════════════════════════
// POST-ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

// ─── 404 Not Found ───────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler (must be last) ─────────────────────

app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP & SHUTDOWN
// ═══════════════════════════════════════════════════════════════

const PORT = config.port;

// In test environments the app is imported by supertest, which provides its own
// ephemeral listener. Binding a fixed port here would cause EADDRINUSE across
// suites and register process-wide signal handlers, so we skip startup entirely.
const isTestEnv = config.nodeEnv === 'test';

// Fail fast in production when at-rest encryption isn't configured — OAuth
// tokens and other secrets must never be persisted without it. Outside
// production we only warn so local/dev boots still work.
if (!isTestEnv) {
  const enc = validateEncryptionEnv();
  for (const w of enc.warnings) {
    logger.warn({ scope: 'encryption-env' }, w);
  }
  if (!enc.valid) {
    if (config.nodeEnv === 'production') {
      logger.error(
        { scope: 'encryption-env', missing: enc.missing },
        'Refusing to start: required encryption environment is missing',
      );
      process.exit(1);
    }
    logger.warn(
      { scope: 'encryption-env', missing: enc.missing },
      'Encryption environment incomplete (permitted outside production)',
    );
  }
}

const server = isTestEnv
  ? undefined
  : app.listen(PORT, async () => {
      logger.info(
        { port: PORT, env: config.nodeEnv, nodeVersion: process.version },
        'AdNexus API server started',
      );

      // Metrics sync worker — gated by BACKGROUND_JOBS_ENABLED + BACKGROUND_METRICS_SYNC_ENABLED
      // (same default-off pattern as evaluate-rules, PR #121 / metrics-sync PR #117)
      if (config.backgroundJobs.enabled && config.backgroundJobs.metricsSyncEnabled) {
        try {
          const { startMetricsSyncWorker } = await import('./workers/metrics-sync');
          const status = await startMetricsSyncWorker();
          loggerApp.info(
            { worker: 'metrics-sync', status: status.status, reason: status.reason },
            'Metrics sync worker startup evaluated',
          );
        } catch (err) {
          loggerApp.error({ err }, 'Failed to start metrics sync worker');
        }
      }

      // Morning brief — legacy path; full scheduler gating lands in PR #79
      if (isRedisAvailable()) {
        try {
          const { startMorningBriefScheduler } = await import('./workers/morning-brief');
          await startMorningBriefScheduler();
          loggerApp.info('Morning brief scheduler started');
        } catch (err) {
          loggerApp.error({ err }, 'Failed to start morning brief scheduler');
        }
      } else {
        loggerApp.info('Redis not available, skipping morning brief scheduler');
      }
    });

// ─── Graceful Shutdown ───────────────────────────────────────

const SHUTDOWN_TIMEOUT_MS = 30_000;
let isShuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  loggerApp.info({ signal }, 'Graceful shutdown initiated...');

  // Stop real-time services
  try {
    rt.stop();
    loggerApp.info('Real-time service stopped');
  } catch (err) {
    loggerApp.error({ err }, 'Error stopping real-time service');
  }

  // Stop accepting new HTTP connections
  const onClosed = async () => {
    loggerApp.info('HTTP server closed, cleaning up resources...');

    if (config.backgroundJobs.enabled && config.backgroundJobs.metricsSyncEnabled) {
      try {
        const { shutdownMetricsSync } = await import('./workers/metrics-sync');
        await shutdownMetricsSync();
        loggerApp.info('Metrics sync worker stopped');
      } catch (err) {
        loggerApp.error({ err }, 'Error stopping metrics sync worker');
      }
    }

    try {
      await closeRedis();
      loggerApp.info('Redis connection closed');
    } catch (err) {
      loggerApp.error({ err }, 'Error closing Redis connection');
    }

    loggerApp.info('Graceful shutdown complete');
    process.exit(0);
  };

  if (server) {
    server.close(onClosed);
  } else {
    void onClosed();
  }

  // Force exit after timeout
  setTimeout(() => {
    loggerApp.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}

// Don't register process-wide signal/error handlers under test — they would
// leak across Jest suites and call process.exit on the test runner.
if (!isTestEnv) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // ─── Unhandled Error Handlers ────────────────────────────────

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception');
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    gracefulShutdown('unhandledRejection');
  });
}

// ─── Module Export ───────────────────────────────────────────

export default app;
