import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../../../domain/value-objects/Result';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId: string;
    role: string;
  } | any;
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

  // For now, decode JWT payload without verification (legacy v1 auth handles verification)
  // In production, this should verify the token properly
  try {
    const token = authHeader.slice(7);
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      next(new UnauthorizedError('Invalid token format'));
      return;
    }
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    req.user = {
      id: payload.sub || payload.id || 'unknown',
      email: payload.email || '',
      workspaceId: payload.workspace_id || payload.workspaceId || '',
      role: payload.role || 'viewer',
    };
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid token'));
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
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      next(new UnauthorizedError('Invalid token format'));
      return;
    }
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    req.user = {
      id: payload.sub || payload.id || 'unknown',
      email: payload.email || '',
      workspaceId: payload.workspace_id || payload.workspaceId || '',
      role: payload.role || 'viewer',
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
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
