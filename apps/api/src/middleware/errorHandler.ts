import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  UnauthorizedError,
  ValidationError,
  PlatformAPIError,
  RateLimitError,
} from '../lib/errors';
import { getRequestLogger } from '../lib/logger';
import { isProduction } from '../config';

/**
 * Structured error response format.
 * Consistent shape across all error types.
 */
interface ErrorResponse {
  /** Always false for error responses — mirrors the `{ success, data }` success contract. */
  success: false;
  error: {
    code: string;
    message: string;
    /** Additional error details (validation issues, etc.) */
    details?: Record<string, unknown>;
  };
  timestamp: string;
  correlationId?: string;
  /** Stack traces only included in non-production environments */
  stack?: string;
}

/**
 * Build a consistent error response object.
 */
function buildErrorResponse(
  message: string,
  code: string,
  correlationId?: string,
  stack?: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
    ...(correlationId ? { correlationId } : {}),
  };

  if (!isProduction && stack) {
    response.stack = stack;
  }

  return response;
}

// ─── Global Error Handler ────────────────────────────────────

/**
 * Global Express error handler.
 *
 * Handles all errors thrown in the application and returns a consistent
 * error response format. Logs errors with correlation IDs for traceability.
 *
 * Error type handling:
 * - ValidationError → 400 with validation details
 * - UnauthorizedError → 401
 * - RateLimitError → 429 with Retry-After context
 * - PlatformAPIError → 502 with platform context
 * - AppError (generic) → uses error's statusCode
 * - Unhandled errors → 500 (generic message in production)
 *
 * **Must be the last middleware in the Express stack.**
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId =
    (req.headers['x-request-id'] as string) ??
    (res.getHeader('X-Request-Id') as string) ??
    'unknown';

  const logger = getRequestLogger(correlationId, {
    path: req.originalUrl ?? req.url,
    method: req.method,
  });

  // ─── Auth Errors ──────────────────────────────────────────

  if (err instanceof UnauthorizedError) {
    logger.warn({ errCode: err.code }, `Authentication error: ${err.message}`);
    res.status(401).json(
      buildErrorResponse(err.message, err.code, correlationId),
    );
    return;
  }

  // ─── Zod Schema Validation Errors ─────────────────────────

  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    logger.info({ fields }, 'Request validation failed');
    res.status(400).json(
      buildErrorResponse('Validation failed', 'VALIDATION_ERROR', correlationId, undefined, {
        fields,
      }),
    );
    return;
  }

  // ─── Validation Errors ────────────────────────────────────

  if (err instanceof ValidationError) {
    logger.info(
      { details: err.details },
      `Validation error: ${err.message}`,
    );
    res.status(400).json(
      buildErrorResponse(err.message, err.code, correlationId, err.stack, err.details),
    );
    return;
  }

  // ─── Rate Limit Errors ────────────────────────────────────

  if (err instanceof RateLimitError) {
    logger.warn({ errCode: err.code }, `Rate limit exceeded: ${err.message}`);
    res.status(429).json(
      buildErrorResponse(err.message, err.code, correlationId),
    );
    return;
  }

  // ─── Platform API Errors ──────────────────────────────────

  if (err instanceof PlatformAPIError) {
    logger.error(
      {
        errCode: err.code,
        platformMessage: err.message,
      },
      `Platform API error: ${err.message}`,
    );
    res.status(502).json(
      buildErrorResponse(
        isProduction ? 'External service unavailable' : err.message,
        err.code,
        correlationId,
      ),
    );
    return;
  }

  // ─── App Errors (generic) ─────────────────────────────────

  if (err instanceof AppError) {
    const isServerError = err.statusCode >= 500;

    if (isServerError) {
      logger.error(
        { errCode: err.code, statusCode: err.statusCode, details: err.details },
        `Application error (${err.statusCode}): ${err.message}`,
      );
    } else {
      logger.info(
        { errCode: err.code, statusCode: err.statusCode },
        `Application error (${err.statusCode}): ${err.message}`,
      );
    }

    res.status(err.statusCode).json(
      buildErrorResponse(
        isProduction && isServerError ? 'Internal server error' : err.message,
        err.code,
        correlationId,
        err.stack,
        isServerError && isProduction ? undefined : err.details,
      ),
    );
    return;
  }

  // ─── Unhandled / Unexpected Errors ────────────────────────

  logger.error(
    {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    },
    `Unhandled error: ${err.message}`,
  );

  res.status(500).json(
    buildErrorResponse(
      isProduction ? 'Internal server error' : err.message,
      'INTERNAL_ERROR',
      correlationId,
      isProduction ? undefined : err.stack,
    ),
  );
}

// ─── Async Handler Utility ───────────────────────────────────

/**
 * Wrap async route handlers to automatically catch rejected promises
 * and forward them to the Express error handling middleware.
 *
 * @example
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
