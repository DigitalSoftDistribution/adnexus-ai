import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import { supabase } from '../../../lib/supabase';
import { UnauthorizedError, ForbiddenError } from '../../../domain/value-objects/Result';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId: string;
    role: string;
  };
}

/**
 * Verify a JWT signature with the shared secret and map it to the v2 user
 * shape. Throws UnauthorizedError on any signature/expiry/format failure so
 * the v2 error handler returns the documented 401 envelope.
 *
 * NOTE: This only validates the JWT cryptographically. Callers must also
 * verify the user still exists in the database (see requireAuth below).
 */
function verifyToken(token: string): AuthenticatedRequest['user'] {
  let payload: Record<string, unknown>;
  try {
    payload = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
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
  };
}

/**
 * V2 authentication middleware.
 *
 * Verifies the JWT signature AND confirms the user still exists in the
 * database. Deleted or disabled users are rejected even with a valid JWT.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid authorization header'));
    return;
  }

  try {
    const user = verifyToken(authHeader.slice(7));

    // Verify user still exists in database (H11 fix)
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
      next(new UnauthorizedError('User no longer exists'));
      return;
    }

    req.user = user;
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
export async function requireAuthQuery(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : (req.query.token as string | undefined);

  if (!token) {
    next(new UnauthorizedError('Missing token'));
    return;
  }

  try {
    const user = verifyToken(token);

    // Verify user still exists in database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
      next(new UnauthorizedError('User no longer exists'));
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * V2 role-based authorization middleware.
 *
 * Queries the workspace_members table to get the CURRENT role, rather than
 * trusting the role in the JWT payload. This ensures role changes take
 * effect immediately rather than waiting for token expiry (C3 fix).
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    try {
      // Query the database for the current role (C3 fix — was checking JWT claim)
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', req.user.workspaceId)
        .eq('user_id', req.user.id)
        .single();

      if (!member) {
        next(new ForbiddenError('Not a member of this workspace'));
        return;
      }

      if (!allowedRoles.includes(member.role)) {
        next(new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`));
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
