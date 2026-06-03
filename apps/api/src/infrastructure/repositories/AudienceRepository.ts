import type { IAudienceRepository, Audience, AudienceFilters, AudienceListResult } from '../../domain/repositories/IAudienceRepository';
import { query } from '../database/connection';

export class AudienceRepository implements IAudienceRepository {
  async list(filters: AudienceFilters): Promise<AudienceListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.platform) {
      conditions.push(`platform = $${++idx}`);
      params.push(filters.platform);
    }
    if (filters.type) {
      conditions.push(`type = $${++idx}`);
      params.push(filters.type);
    }
    if (filters.status) {
      conditions.push(`status = $${++idx}`);
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(`name ILIKE $${++idx}`);
      params.push(`%${filters.search}%`);
    }

    const where = conditions.join(' AND ');

    const { rows } = await query<Audience>(
      `SELECT * FROM audiences WHERE ${where} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audiences WHERE ${where}`,
      params,
    );

    return {
      audiences: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Audience | null> {
    const { rows } = await query<Audience>(
      `SELECT * FROM audiences WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Audience | null> {
    const { rows } = await query<Audience>(
      `SELECT * FROM audiences WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async create(audience: Omit<Audience, 'id' | 'createdAt' | 'updatedAt'>): Promise<Audience> {
    const { rows } = await query<Audience>(
      `INSERT INTO audiences (workspace_id, platform, platform_audience_id, name, type, size, targeting, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        audience.workspaceId, audience.platform, audience.platformAudienceId,
        audience.name, audience.type, audience.size,
        audience.targeting ? JSON.stringify(audience.targeting) : null,
        audience.status,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Audience>): Promise<Audience | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${++idx}`);
      params.push(updates.name);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${++idx}`);
      params.push(updates.type);
    }
    if (updates.size !== undefined) {
      setClauses.push(`size = $${++idx}`);
      params.push(updates.size);
    }
    if (updates.targeting !== undefined) {
      setClauses.push(`targeting = $${++idx}`);
      params.push(JSON.stringify(updates.targeting));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${++idx}`);
      params.push(updates.status);
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Audience>(
      `UPDATE audiences SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM audiences WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async getInsights(_audienceId: string): Promise<Record<string, unknown> | null> {
    // Placeholder — would query audience performance data
    return {
      reach: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };
  }
}
