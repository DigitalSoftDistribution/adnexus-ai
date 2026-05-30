import type { IAdSetRepository, AdSetFilters, AdSetListResult } from '../../domain/repositories/IAdSetRepository';
import type { AdSet } from '../../domain/entities/AdSet';
import { query } from '../database/connection';

export class AdSetRepository implements IAdSetRepository {
  async findById(id: string): Promise<AdSet | null> {
    const { rows } = await query<AdSet>(
      `SELECT * FROM adsets WHERE id = $1 LIMIT 1`, [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<AdSet | null> {
    const { rows } = await query<AdSet>(
      `SELECT * FROM adsets WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async findByCampaign(campaignId: string): Promise<AdSet[]> {
    const { rows } = await query<AdSet>(
      `SELECT * FROM adsets WHERE campaign_id = $1 ORDER BY created_at DESC`, [campaignId],
    );
    return rows;
  }

  async list(filters: AdSetFilters): Promise<AdSetListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.campaignId) {
      conditions.push(`campaign_id = $${++idx}`);
      params.push(filters.campaignId);
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
      `SELECT COUNT(*)::text as count FROM adsets WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<AdSet>(
      `SELECT * FROM adsets WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { adSets: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(adSet: Omit<AdSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdSet> {
    const { rows } = await query<AdSet>(
      `INSERT INTO adsets (workspace_id, campaign_id, platform, platform_adset_id, name, status, daily_budget, bid_strategy, bid_amount, targeting, platform_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        adSet.workspaceId, adSet.campaignId, adSet.platform, adSet.platformAdsetId,
        adSet.name, adSet.status, adSet.dailyBudget, adSet.bidStrategy,
        adSet.bidAmount, adSet.targeting, adSet.platformData,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<AdSet>): Promise<AdSet | null> {
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

    const { rows } = await query<AdSet>(
      `UPDATE adsets SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM adsets WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByCampaign(campaignId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM adsets WHERE campaign_id = $1`, [campaignId],
    );
    return parseInt(rows[0].count, 10);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
