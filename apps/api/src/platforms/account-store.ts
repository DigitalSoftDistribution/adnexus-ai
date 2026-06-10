/**
 * Ad-account persistence for the PlatformManager.
 *
 * Reads/writes the `ad_accounts` table (canonical columns reconciled in
 * migration 024) and maps rows to the platform-layer `AdAccount` shape.
 */

import { query } from '../infrastructure/database/connection';
import type { AdAccount, Platform } from './types';

interface AdAccountRow {
  id: string;
  workspace_id: string;
  platform: string;
  platform_account_id: string;
  name: string;
  oauth_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

function mapRow(row: AdAccountRow): AdAccount {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    platform: row.platform as Platform,
    platformAccountId: row.platform_account_id,
    name: row.name,
    currency: (meta.currency as string) ?? 'USD',
    timezone: (meta.timezone as string) ?? 'UTC',
    status: (row.status === 'active' ? 'active' : 'disconnected') as AdAccount['status'],
    accessToken: row.oauth_token ?? '',
    refreshToken: row.refresh_token ?? undefined,
    tokenExpiresAt: row.token_expires_at ?? undefined,
    metadata: meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

const SELECT_COLS = `id, workspace_id, platform, platform_account_id, name,
  oauth_token, refresh_token, token_expires_at, status, metadata, created_at, updated_at`;

/** Load a single active ad account by its internal id. */
export async function loadAdAccountById(accountId: string): Promise<AdAccount | null> {
  const { rows } = await query<AdAccountRow>(
    `SELECT ${SELECT_COLS} FROM ad_accounts
     WHERE id = $1 AND is_active = true
     LIMIT 1`,
    [accountId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/** Load all active ad accounts for a workspace. */
export async function loadWorkspaceAccounts(workspaceId: string): Promise<AdAccount[]> {
  const { rows } = await query<AdAccountRow>(
    `SELECT ${SELECT_COLS} FROM ad_accounts
     WHERE workspace_id = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [workspaceId],
  );
  return rows.map(mapRow);
}

/** Persist a refreshed token for a single account. */
export async function persistRefreshedToken(
  accountId: string,
  accessToken: string,
  tokenExpiresAt: string | undefined,
): Promise<void> {
  await query(
    `UPDATE ad_accounts
     SET oauth_token = $2, token_expires_at = $3, updated_at = NOW()
     WHERE id = $1`,
    [accountId, accessToken, tokenExpiresAt ?? null],
  );
}

/** Mark an account disconnected and clear its tokens. */
export async function markAccountDisconnected(accountId: string): Promise<void> {
  await query(
    `UPDATE ad_accounts
     SET status = 'disconnected', is_active = false, oauth_token = NULL,
         refresh_token = NULL, updated_at = NOW()
     WHERE id = $1`,
    [accountId],
  );
}
