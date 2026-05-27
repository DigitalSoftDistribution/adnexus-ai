export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
  }
}

export class PlatformError extends AppError {
  constructor(platform: string, message: string) {
    super('PLATFORM_ERROR', `[${platform}] ${message}`, 502);
  }
}

/** Platform API error — external API call failed */
export class PlatformAPIError extends AppError {
  public readonly platform: string;

  constructor(
    platform: string,
    message: string,
    statusCode: number = 502,
    public readonly responseBody?: unknown,
  ) {
    super('PLATFORM_API_ERROR', `[${platform}] ${message}`, statusCode >= 500 ? 502 : 500);
    this.name = 'PlatformAPIError';
    this.platform = platform;
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        details: {
          platform: this.platform,
          responseBody: this.responseBody,
        } as Record<string, unknown>,
      },
    };
  }
}
