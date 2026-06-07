import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { getRedisClient } from '../../lib/redis';
import { supabase } from '../../lib/supabase';

export type OAuthPlatform = 'meta' | 'google' | 'tiktok' | 'snap';

export interface OAuthStatePayload {
  platform: OAuthPlatform;
  workspaceId: string;
  userId: string;
  accountId?: string | null;
  reconnect?: boolean;
  nonce: string;
}

export function integrationsRedirect(platform: OAuthPlatform, status: string, reason: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ platform, status, reason, ...(extra ?? {}) });
  return `${config.frontend.url}/dashboard/integrations?${params.toString()}`;
}

export function oauthCallbackUrl(platform: OAuthPlatform): string {
  return `${config.frontend.url.replace(/\/$/, '')}/api/v1/auth/${platform}/callback`;
}

export function wantsJson(req: { accepts: (type: string) => string | false }): boolean {
  const acceptsJson = req.accepts('json');
  const acceptsHtml = req.accepts('html');
  return acceptsJson === 'json' && acceptsHtml !== 'html';
}

export function sendOAuthJsonError(
  req: { accepts: (type: string) => string | false },
  res: { status: (code: number) => { json: (body: unknown) => void }; redirect: (url: string) => void },
  statusCode: number,
  platform: OAuthPlatform,
  status: string,
  reason: string,
  message: string,
): void {
  if (wantsJson(req)) {
    res.status(statusCode).json({
      success: false,
      error: message,
      code: reason.toUpperCase(),
      data: { platform, status, reason },
    });
    return;
  }

  res.redirect(integrationsRedirect(platform, status, reason));
}

const STATE_TTL_SECONDS = 10 * 60;
const memoryStateNonces = new Map<string, number>();

function nonceKey(platform: OAuthPlatform, nonce: string): string {
  return `oauth:state:${platform}:${nonce}`;
}

function purgeExpiredMemoryNonces(now = Date.now()): void {
  for (const [key, expiresAt] of memoryStateNonces.entries()) {
    if (expiresAt <= now) memoryStateNonces.delete(key);
  }
}

export async function createOAuthState(payload: Omit<OAuthStatePayload, 'nonce'>): Promise<string> {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const fullPayload: OAuthStatePayload = { ...payload, nonce };
  const key = nonceKey(payload.platform, nonce);
  const expiresAt = Date.now() + STATE_TTL_SECONDS * 1000;

  purgeExpiredMemoryNonces();
  memoryStateNonces.set(key, expiresAt);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, '1', 'EX', STATE_TTL_SECONDS);
    } catch {
      // Fall back to the in-process nonce store if Redis is temporarily unavailable.
    }
  }

  return jwt.sign(fullPayload, config.jwt.secret, { expiresIn: `${STATE_TTL_SECONDS}s` });
}

export function verifyOAuthState(state: unknown, platform: OAuthPlatform): OAuthStatePayload | null {
  if (typeof state !== 'string' || !state) return null;
  try {
    const decoded = jwt.verify(state, config.jwt.secret) as Partial<OAuthStatePayload>;
    if (
      decoded.platform !== platform ||
      typeof decoded.workspaceId !== 'string' ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.nonce !== 'string' ||
      !decoded.nonce
    ) {
      return null;
    }
    return {
      platform,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      accountId: typeof decoded.accountId === 'string' ? decoded.accountId : null,
      reconnect: decoded.reconnect === true,
      nonce: decoded.nonce,
    };
  } catch {
    return null;
  }
}

export async function consumeOAuthStateNonce(platform: OAuthPlatform, nonce: string): Promise<boolean> {
  const key = nonceKey(platform, nonce);

  const redis = getRedisClient();
  if (redis) {
    try {
      const deleted = await redis.del(key);
      return deleted === 1;
    } catch {
      return false;
    }
  }

  purgeExpiredMemoryNonces();
  const memoryExpiresAt = memoryStateNonces.get(key);
  const found = Boolean(memoryExpiresAt && memoryExpiresAt > Date.now());
  memoryStateNonces.delete(key);

  return found;
}

export async function userCanManageOAuthWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

export function requestWorkspaceMatchesAuthenticatedWorkspace(requestedWorkspaceId: unknown, authenticatedWorkspaceId: string | undefined): boolean {
  if (!authenticatedWorkspaceId) return false;
  if (typeof requestedWorkspaceId === 'string' && requestedWorkspaceId && requestedWorkspaceId !== authenticatedWorkspaceId) return false;
  return true;
}
