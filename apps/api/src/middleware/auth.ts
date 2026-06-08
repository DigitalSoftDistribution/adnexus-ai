import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import type { JWTPayload, WorkspaceRole } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation requires namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
      workspaceId?: string;
      workspace?: { id: string };
    }
  }
}

/** Extract and verify JWT from Authorization header */
export async function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'], clockTolerance: 60 }) as JWTPayload;

    // Verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedError('User no longer exists');
    }

    req.user = payload;
    req.workspaceId = payload.workspace_id;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(err);
    }
  }
}

/** Shortcut: combine authentication + workspace check */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  authenticateToken(req, res, next);
}

/** Check workspace membership and role */
export function requireRole(...allowedRoles: WorkspaceRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.workspaceId) {
        throw new UnauthorizedError();
      }

      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', req.workspaceId)
        .eq('user_id', req.user.sub)
        .single();

      if (!member) {
        throw new ForbiddenError('Not a member of this workspace');
      }

      if (!allowedRoles.includes(member.role)) {
        throw new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Owner or admin only */
export const requireAdmin = requireRole('owner', 'admin');

/** Any authenticated workspace member */
export const requireMember = requireRole('owner', 'admin', 'analyst', 'viewer');

/** Attach workspace from header/param and validate membership */
export async function requireWorkspace(req: Request, _res: Response, next: NextFunction) {
  try {
    const wsId = req.headers['x-workspace-id'] as string || req.params.workspaceId;
    if (!wsId) {
      throw new UnauthorizedError();
    }
    req.workspace = { id: wsId };
    next();
  } catch (err) {
    next(err);
  }
}
