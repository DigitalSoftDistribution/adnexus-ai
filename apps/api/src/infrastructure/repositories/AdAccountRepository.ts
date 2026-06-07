import type { IAdAccountRepository, AdAccountFilters, AdAccountListResult } from '../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../domain/entities/AdAccount';
import { query } from '../database/connection';

/**
 * Map a snake_case `ad_accounts` row to the camelCase AdAccount entity.
 * The driver returns column names verbatim (e.g. `platform_account_id`), so a
 * bare `SELECT *` cast would leave camelCase fields undefined — which silently
 * breaks consumers like account sync that read `platformAccountId`.
 */
function mapRow(r: Record<string, unknown>): AdAccount {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    platform: r.platform as AdAccount['platform'],
    platformAccountId: r.platform_account_id as string,
    name: (r.name ?? '') as string,
    status: r.status as AdAccount['status'],
    oauthToken: (r.oauth_token ?? null) as string | null,
    refreshToken: (r.refresh_token ?? null) as string | null,
    tokenExpiresAt: r.token_expires_at ? new Date(r.token_expires_at as string) : null,
    isActive: r.is_active === undefined || r.is_active === null ? r.status === 'active' : Boolean(r.is_active),
    scopes: Array.isArray(r.scopes) ? (r.scopes as string[]) : [],
    lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at as string) : null,
    spendCap: r.spend_cap === null || r.spend_cap === undefined ? null : Number(r.spend_cap),
    disabledReason: (r.disabled_reason ?? null) as string | null,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date((r.updated_at ?? r.created_at) as string),
  };
}

export class AdAccountRepository implements IAdAccountRepository {
  async findById(id: string): Promise<AdAccount | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ad_accounts WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<AdAccount | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ad_accounts WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByPlatformAccountId(platformAccountId: string, platform: string): Promise<AdAccount | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ad_accounts WHERE platform_account_id = $1 AND platform = $2 LIMIT 1`,
      [platformAccountId, platform],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByWorkspace(workspaceId: string): Promise<AdAccount[]> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ad_accounts WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId],
    );
    return rows.map(mapRow);
  }

  async list(filters: AdAccountFilters): Promise<AdAccountListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.platform) {
      const platforms = Array.isArray(filters.platform) ? filters.platform : [filters.platform];
      conditions.push(`platform = ANY($${++idx}::text[])`);
      params.push(platforms);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }

    if (filters.search) {
      conditions.push(`name ILIKE $${++idx}`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ad_accounts WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ad_accounts WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { adAccounts: rows.map(mapRow), total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(adAccount: Omit<AdAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdAccount> {
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO ad_accounts (workspace_id, platform, platform_account_id, name, status, oauth_token, refresh_token, token_expires_at, is_active, scopes, spend_cap, disabled_reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        adAccount.workspaceId, adAccount.platform, adAccount.platformAccountId,
        adAccount.name, adAccount.status, adAccount.oauthToken, adAccount.refreshToken,
        adAccount.tokenExpiresAt, adAccount.isActive, adAccount.scopes,
        adAccount.spendCap, adAccount.disabledReason, adAccount.metadata,
      ],
    );
    return mapRow(rows[0]);
  }

  async update(id: string, updates: Partial<AdAccount>): Promise<AdAccount | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`${this.camelToSnake(key)} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Record<string, unknown>>(
      `UPDATE ad_accounts SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM ad_accounts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ad_accounts WHERE workspace_id = $1`,
      [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
