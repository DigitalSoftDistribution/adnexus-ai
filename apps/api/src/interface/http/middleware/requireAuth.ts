import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../../../domain/value-objects/Result';
import { verifySupabaseToken } from '../../../middleware/authenticate';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId: string;
    role: string;
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

  const token = authHeader.slice(7);

  verifySupabaseToken(token)
    .then((payload) => {
      req.user = {
        id: payload.sub,
        email: payload.email,
        workspaceId: payload.workspace_id,
        role: payload.role,
      };
      next();
    })
    .catch((err) => next(err));
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
