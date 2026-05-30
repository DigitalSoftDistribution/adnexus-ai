import type { Request, Response, NextFunction } from 'express';

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'refresh_token',
  'access_token',
  'api_key',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'jwt',
  'private_key',
  'stripe_webhook_secret',
  'supabase_service_key',
  'database_url',
]);

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api.?key/i,
  /authorization/i,
  /private.?key/i,
  /credential/i,
];

/**
 * Recursively redact sensitive fields from an object.
 */
function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Redact if it looks like a JWT
    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/.test(obj)) {
      return '[JWT_REDACTED]';
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_FIELDS.has(lowerKey) ||
      SENSITIVE_FIELDS.has(key) ||
      SENSITIVE_PATTERNS.some((p) => p.test(key));

    if (isSensitive && typeof value === 'string') {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitive(value, depth + 1);
    }
  }
  return result;
}

/**
 * Middleware that redacts sensitive fields from logged request bodies.
 */
export function redactRequestBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    (req as unknown as Record<string, unknown>).redactedBody = redactSensitive(req.body);
  }
  next();
}

/**
 * Redact sensitive headers before logging.
 */
export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'authorization' ||
      lowerKey === 'cookie' ||
      lowerKey === 'x-api-key' ||
      lowerKey === 'x-workspace-id'
    ) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

export { redactSensitive };
