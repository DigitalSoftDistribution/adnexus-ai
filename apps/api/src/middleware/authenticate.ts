import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import type { JWTPayload, WorkspaceRole } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation requires namespace
  namespace Express {
    interface Request {
      /** Authenticated user payload from Supabase JWT */
      user?: JWTPayload;
      /** Active workspace ID extracted from token claims */
      workspaceId?: string;
      /** API key scopes set by API key auth middleware */
      apiKeyScopes?: string[];
      /** API key database ID, set when authenticated via API key */
      apiKeyId?: string;
      /** API key platforms restriction, set by API key auth middleware */
      apiKeyPlatforms?: string[];
      /** Exact raw request body bytes, captured by the JSON body-parser verify
       *  hook — used for provider webhook signature verification. */
      rawBody?: Buffer;
    }
  }
}

/**
 * Verify a Supabase JWT token by calling `auth.getUser()`.
 *
 * Unlike local `jwt.verify()`, this round-trips to Supabase to ensure:
 *   1. The token hasn't been revoked
 *   2. The user hasn't been deleted / disabled
 *   3. The token signature and expiry are valid
 *
 * @param token — raw JWT string (without "Bearer " prefix)
 * @returns JWTPayload with user id, email, workspace, and role
 * @throws UnauthorizedError on any verification failure
 */
async function verifySupabaseToken(token: string): Promise<JWTPayload> {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const sbUser = data.user;

  // Extract workspace claim from user_metadata or app_metadata
  const workspaceId =
    (sbUser.user_metadata?.workspace_id as string | undefined) ??
    (sbUser.app_metadata?.workspace_id as string | undefined);

  const role =
    (sbUser.user_metadata?.role as WorkspaceRole | undefined) ??
    (sbUser.app_metadata?.role as WorkspaceRole | undefined) ??
    'viewer';

  if (!workspaceId) {
    throw new UnauthorizedError('Token missing workspace context');
  }

  const payload: JWTPayload = {
    sub: sbUser.id,
    email: sbUser.email ?? '',
    workspace_id: workspaceId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: (sbUser as unknown as Record<string, unknown>).exp ? Math.floor(Number((sbUser as unknown as Record<string, unknown>).exp) / 1000) : 0,
  };

  return payload;
}

/**
 * Express middleware — authenticate requests via Supabase JWT.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies it with
 * Supabase Auth, and attaches `req.user` + `req.workspaceId`.
 *
 * @example
 *   app.get('/api/v1/protected', authenticate, (req, res) => {
 *     res.json({ userId: req.user.sub, workspace: req.workspaceId });
 *   });
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedError('Empty Bearer token');
    }

    const payload = await verifySupabaseToken(token);

    req.user = payload;
    req.workspaceId = payload.workspace_id;

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

/**
 * Require a specific workspace role (or set of roles).
 * Must be used **after** `authenticate` in the middleware chain.
 *
 * @param allowedRoles — one or more roles that may access the route
 *
 * @example
 *   app.patch('/api/v1/settings', authenticate, requireRole('owner', 'admin'), handler);
 */
export function requireRole(...allowedRoles: WorkspaceRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.workspaceId) {
        throw new UnauthorizedError('Authentication required');
      }

      const { data: member, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', req.workspaceId)
        .eq('user_id', req.user.sub)
        .single();

      if (error || !member) {
        throw new ForbiddenError('Not a member of this workspace');
      }

      if (!allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`,
        );
      }

      // Augment the user object with the canonical role from DB
      req.user.role = member.role;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Shorthand — require workspace owner or admin */
export const requireAdmin = requireRole('owner', 'admin');

/** Shorthand — require any authenticated workspace member */
export const requireMember = requireRole('owner', 'admin', 'analyst', 'viewer');
