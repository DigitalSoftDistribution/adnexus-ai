import type { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../domain/value-objects/Result';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function expressErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Domain errors
  if (err instanceof DomainError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: (err as { errors?: unknown }).errors,
      },
    };
    res.status(400).json(response);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    };
    res.status(401).json(response);
    return;
  }

  const statusBearingError = err as Error & { status?: number; statusCode?: number; code?: string };
  const statusCode = statusBearingError.status ?? statusBearingError.statusCode;
  if (statusCode && statusCode >= 400 && statusCode < 600) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: typeof statusBearingError.code === 'string' ? statusBearingError.code : 'HTTP_ERROR',
        message: err.message,
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  // Generic fallback
  console.error('Unhandled error:', err);
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}

export function asyncHandler<T = Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<void>) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
