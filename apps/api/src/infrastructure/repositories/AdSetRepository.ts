import type { IAdSetRepository } from '../../domain/repositories/IAdSetRepository';
import type { AdSet, AdSetFilters, AdSetListResult } from '../../domain/entities/AdSet';
import { query } from '../database/connection';

export class AdSetRepository implements IAdSetRepository {
  async findById(id: string): Promise<AdSet | null> {
    const { rows } = await query<AdSet>(
      `SELECT * FROM ad_sets WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndCampaign(id: string, campaignId: string): Promise<AdSet | null> {
    const { rows } = await query<AdSet>(
      `SELECT * FROM ad_sets WHERE id = $1 AND campaign_id = $2 LIMIT 1`,
      [id, campaignId],
    );
    return rows[0] ?? null;
  }

  async list(filters: AdSetFilters): Promise<AdSetListResult> {
    const conditions: string[] = ['campaign_id = $1'];
    const params: unknown[] = [filters.campaignId];
    let paramIdx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      paramIdx++;
      conditions.push(`status = ANY($${paramIdx}::text[])`);
      params.push(statuses);
    }

    if (filters.search) {
      paramIdx++;
      conditions.push(`name ILIKE $${paramIdx}`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = this.getSortColumn(filters.sortBy);
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ad_sets WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: adSets } = await query<AdSet>(
      `SELECT * FROM ad_sets
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${++paramIdx} OFFSET $${++paramIdx}`,
      [...params, limit, offset],
    );

    return {
      adSets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(adSet: Omit<AdSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdSet> {
    const { rows } = await query<AdSet>(
      `INSERT INTO ad_sets (
        campaign_id, platform_ad_set_id, name, status, budget, budget_type,
        bid_strategy, bid_amount, targeting, spend, impressions, clicks,
        ctr, conversions, cpa, roas, cpm, cpc, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        adSet.campaignId, adSet.platformAdSetId, adSet.name, adSet.status,
        adSet.budget, adSet.budgetType, adSet.bidStrategy, adSet.bidAmount,
        adSet.targeting, adSet.spend, adSet.impressions, adSet.clicks,
        adSet.ctr, adSet.conversions, adSet.cpa, adSet.roas,
        adSet.cpm, adSet.cpc, adSet.frequency,
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
        const column = this.camelToSnake(key);
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<AdSet>(
      `UPDATE ad_sets SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM ad_sets WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByCampaign(campaignId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ad_sets WHERE campaign_id = $1`,
      [campaignId],
    );
    return parseInt(rows[0].count, 10);
  }

  private getSortColumn(sortBy?: string): string {
    const columns: Record<string, string> = {
      name: 'name',
      status: 'status',
      created_at: 'created_at',
      updated_at: 'updated_at',
      spend: 'spend',
      impressions: 'impressions',
      clicks: 'clicks',
      ctr: 'ctr',
      roas: 'roas',
      conversions: 'conversions',
    };
    return columns[sortBy ?? ''] ?? 'created_at';
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
