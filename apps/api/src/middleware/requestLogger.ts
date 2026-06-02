import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRequestLogger } from '../lib/logger';
import { httpRequestDuration, httpRequestTotal } from '../lib/monitoring';
import { isProduction } from '../config';

// ─── Extend Express Request ──────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation requires namespace
  namespace Express {
    interface Request {
      /** Unique correlation ID for request tracing */
      requestId?: string;
      /** Request start timestamp (high-resolution) */
      requestStartTime?: number;
    }
  }
}

// ─── Constants ───────────────────────────────────────────────

const SLOW_REQUEST_THRESHOLD_MS = 1000;

/** Routes to skip logging (health checks, metrics) */
const SKIP_LOG_PATHS = ['/health', '/ready', '/live', '/metrics'];

// ─── Helpers ─────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
}

function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    const base = req.baseUrl ?? '';
    return `${base}${req.route.path}`;
  }
  return req.path ?? 'unknown';
}

/**
 * Sanitize query parameters to remove sensitive data from logs.
 * Redacts tokens, passwords, secrets, and other sensitive fields.
 */
function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'password', 'secret', 'api_key', 'apikey', 'authorization', 'jwt'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ─── Request Logger Middleware ───────────────────────────────

/**
 * Express middleware that:
 * 1. Generates a correlation ID per request (from x-request-id header or UUID)
 * 2. Logs structured request/response data in JSON format
 * 3. Records Prometheus metrics for each request
 * 4. Identifies slow requests and security events
 * 5. Skips logging for health check endpoints
 *
 * Must be placed early in the middleware stack (before routes).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate or accept correlation ID
  req.requestId =
    (req.headers['x-request-id'] as string) ?? uuidv4();
  req.requestStartTime = Date.now();

  // Expose correlation ID to the client
  res.setHeader('X-Request-Id', req.requestId);

  // Check if this is a health check endpoint (skip logging)
  const path = req.path ?? req.url;
  const shouldSkipLog = SKIP_LOG_PATHS.some((skipPath) => path === skipPath);

  // Capture original end function
  const originalEnd = res.end.bind(res);

  // Override res.end to log after response completes
  res.end = function (
    this: Response,
    chunk?: unknown,
    encoding?: unknown,
    cb?: () => void,
  ): Response {
    const responseTimeMs = Date.now() - (req.requestStartTime ?? 0);
    const statusCode = res.statusCode;
    const route = normalizeRoute(req);
    const method = req.method;
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;

    // ─── Prometheus metrics ──────────────────────────────────
    const durationSeconds = responseTimeMs / 1000;
    httpRequestDuration.observe(
      { method, route, status_code: String(statusCode) },
      durationSeconds,
    );
    httpRequestTotal.inc({ method, route, status_code: String(statusCode) });

    // ─── Structured logging (skip for health checks) ─────────
    if (!shouldSkipLog) {
      const logger = getRequestLogger(req.requestId ?? 'unknown', {
        userId,
        workspaceId,
      });

      const logData = {
        method,
        path: req.originalUrl ?? req.url,
        route,
        statusCode,
        responseTimeMs,
        ip: isProduction ? undefined : getClientIp(req),
        userAgent: req.headers['user-agent'] ?? '',
        query: Object.keys(req.query).length > 0 ? sanitizeQuery(req.query as Record<string, unknown>) : undefined,
        userId,
        workspaceId,
      };

      // Determine log level based on status code
      if (statusCode >= 500) {
        logger.error(logData, `${method} ${route} ${statusCode} ${responseTimeMs}ms`);
      } else if (statusCode === 429) {
        logger.warn(logData, `RATE_LIMITED: ${method} ${route} ${statusCode} ${responseTimeMs}ms`);
      } else if (statusCode >= 400) {
        logger.warn(logData, `${method} ${route} ${statusCode} ${responseTimeMs}ms`);
      } else if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS) {
        logger.warn(
          { ...logData, slow: true },
          `SLOW: ${method} ${route} ${statusCode} ${responseTimeMs}ms`,
        );
      } else {
        logger.info(logData, `${method} ${route} ${statusCode} ${responseTimeMs}ms`);
      }
    }

    // Call original res.end
    if (chunk !== undefined) {
      originalEnd(chunk as never, encoding as never, cb);
    } else {
      (originalEnd as () => void)();
    }

    return res;
  };

  next();
}
