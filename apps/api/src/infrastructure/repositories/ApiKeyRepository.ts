import type { IApiKeyRepository, ApiKeyFilters, ApiKeyListResult } from '../../domain/repositories/IApiKeyRepository';
import type { ApiKey } from '../../domain/entities/ApiKey';
import { query } from '../database/connection';

export class ApiKeyRepository implements IApiKeyRepository {
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const { rows } = await query<ApiKey>(
      `SELECT * FROM api_keys WHERE key_hash = $1 AND status = 'active' LIMIT 1`, [keyHash],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const { rows } = await query<ApiKey>(`SELECT * FROM api_keys WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<ApiKey | null> {
    const { rows } = await query<ApiKey>(
      `SELECT * FROM api_keys WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: ApiKeyFilters): Promise<ApiKeyListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

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
      `SELECT COUNT(*)::text as count FROM api_keys WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<ApiKey>(
      `SELECT * FROM api_keys WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { apiKeys: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiKey> {
    const { rows } = await query<ApiKey>(
      `INSERT INTO api_keys (workspace_id, name, key_hash, key_prefix, scopes, status, expires_at, created_by, calls_today, calls_this_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        apiKey.workspaceId, apiKey.name, apiKey.keyHash, apiKey.keyPrefix,
        JSON.stringify(apiKey.scopes), apiKey.status, apiKey.expiresAt,
        apiKey.createdBy, apiKey.callsToday, apiKey.callsThisMonth,
      ],
    );
    return rows[0];
  }

  async updateStatus(id: string, status: ApiKey['status'], revokedBy?: string): Promise<ApiKey | null> {
    const { rows } = await query<ApiKey>(
      `UPDATE api_keys SET status = $2, revoked_by = $3, revoked_at = CASE WHEN $2 = 'revoked' THEN NOW() ELSE NULL END WHERE id = $1 RETURNING *`,
      [id, status, revokedBy ?? null],
    );
    return rows[0] ?? null;
  }

  async updateUsage(id: string): Promise<void> {
    await query(
      `UPDATE api_keys SET last_used_at = NOW(), calls_today = calls_today + 1, calls_this_month = calls_this_month + 1 WHERE id = $1`,
      [id],
    );
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM api_keys WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM api_keys WHERE workspace_id = $1`, [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }
}
