import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
      /** API key scopes set by API key auth middleware */
      apiKeyScopes?: string[];
      /** API key database ID, set when authenticated via API key */
      apiKeyId?: string;
      /** API key platforms restriction, set by API key auth middleware */
      apiKeyPlatforms?: string[];
    }
  }
}

const DEFAULT_API_KEY_PLATFORMS = ['meta', 'google', 'tiktok', 'snap'];

function parseJsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as string[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function authenticateApiKey(rawKey: string, req: Request, next: NextFunction) {
  const keyHash = hashApiKey(rawKey);

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('id, workspace_id, scopes, platforms, status, expires_at, created_by')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .single();

  if (error || !keyRecord) {
    throw new UnauthorizedError('Invalid API key');
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at as string) < new Date()) {
    throw new UnauthorizedError('API key expired');
  }

  const scopes = parseJsonStringArray(keyRecord.scopes);
  const platforms = parseJsonStringArray(keyRecord.platforms);
  const resolvedPlatforms = platforms.length > 0 ? platforms : DEFAULT_API_KEY_PLATFORMS;

  req.apiKeyScopes = scopes;
  req.apiKeyPlatforms = resolvedPlatforms;
  req.apiKeyId = keyRecord.id as string;
  req.workspaceId = keyRecord.workspace_id as string;
  req.user = {
    sub: (keyRecord.created_by as string | null) ?? (keyRecord.id as string),
    email: '',
    workspace_id: keyRecord.workspace_id as string,
    role: 'viewer',
    apiKeyId: keyRecord.id as string,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id);

  next();
}

/** Extract and verify JWT or API key from Authorization header */
export async function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Empty Bearer token');
    }

    if (token.startsWith('ak_live_')) {
      await authenticateApiKey(token, req, next);
      return;
    }

    const payload = jwt.verify(token, config.jwt.secret, { clockTolerance: 60 }) as JWTPayload;

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

      // API keys use scope checks instead of workspace RBAC.
      if (req.user.apiKeyId) {
        throw new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`);
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
