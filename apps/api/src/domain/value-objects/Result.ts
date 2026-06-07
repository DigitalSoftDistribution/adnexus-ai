export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

export class DomainError extends Error {
  readonly details?: unknown;

  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number = 400,
    details?: unknown,
  ) {
    super(message);
    this.details = details;
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends DomainError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
