import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import { UnauthorizedError, ForbiddenError, DomainError } from '../../../domain/value-objects/Result';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId: string;
    role: string;
    emailVerified?: boolean;
  } | any;
}

export class EmailNotVerifiedError extends DomainError {
  constructor(message = 'Please verify your email before continuing') {
    super(message, 'EMAIL_NOT_VERIFIED', 403);
    this.name = 'EmailNotVerifiedError';
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

/**
 * Verify a JWT signature with the shared secret and map it to the v2 user
 * shape. Throws UnauthorizedError on any signature/expiry/format failure so
 * the v2 error handler returns the documented 401 envelope.
 */
function verifyToken(token: string): AuthenticatedRequest['user'] {
  let payload: Record<string, unknown>;
  try {
    payload = jwt.verify(token, config.jwt.secret, {
      clockTolerance: 60,
    }) as Record<string, unknown>;
  } catch {
    throw new UnauthorizedError('Invalid token');
  }

  return {
    id: (payload.sub as string) || (payload.id as string) || 'unknown',
    email: (payload.email as string) || '',
    workspaceId:
      (payload.workspace_id as string) || (payload.workspaceId as string) || '',
    role: (payload.role as string) || 'viewer',
    emailVerified: payload.emailVerified === true,
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid authorization header'));
    return;
  }

  try {
    req.user = verifyToken(authHeader.slice(7));
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Auth for endpoints reached via EventSource (SSE), which cannot set an
 * Authorization header. Accepts the token from the `?token=` query param (and
 * still honors a Bearer header if present), then sets req.user like requireAuth.
 */
export function requireAuthQuery(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : (req.query.token as string | undefined);

  if (!token) {
    next(new UnauthorizedError('Missing token'));
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireVerifiedEmail(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (req.user.emailVerified !== true) {
    next(new EmailNotVerifiedError());
    return;
  }

  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`));
      return;
    }

    next();
  };
}
