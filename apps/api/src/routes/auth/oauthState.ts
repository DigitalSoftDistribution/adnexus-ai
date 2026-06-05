import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { supabase } from '../../lib/supabase';

export type OAuthPlatform = 'meta' | 'google' | 'tiktok' | 'snap';

export interface OAuthStatePayload {
  platform: OAuthPlatform;
  workspaceId: string;
  userId: string;
  accountId?: string | null;
  reconnect?: boolean;
}

export function integrationsRedirect(platform: OAuthPlatform, status: string, reason: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ platform, status, reason, ...(extra ?? {}) });
  return `${config.frontend.url}/dashboard/integrations?${params.toString()}`;
}

export function createOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '10m' });
}

export function verifyOAuthState(state: unknown, platform: OAuthPlatform): OAuthStatePayload | null {
  if (typeof state !== 'string' || !state) return null;
  try {
    const decoded = jwt.verify(state, config.jwt.secret) as Partial<OAuthStatePayload>;
    if (
      decoded.platform !== platform ||
      typeof decoded.workspaceId !== 'string' ||
      typeof decoded.userId !== 'string'
    ) {
      return null;
    }
    return {
      platform,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      accountId: typeof decoded.accountId === 'string' ? decoded.accountId : null,
      reconnect: decoded.reconnect === true,
    };
  } catch {
    return null;
  }
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
