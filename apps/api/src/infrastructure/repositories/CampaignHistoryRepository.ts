import type { ICampaignHistoryRepository, CampaignHistoryFilters, CampaignHistoryListResult } from '../../domain/repositories/ICampaignHistoryRepository';
import type { CampaignHistoryEntry } from '../../domain/entities/CampaignHistory';
import { query } from '../database/connection';

export class CampaignHistoryRepository implements ICampaignHistoryRepository {
  async list(filters: CampaignHistoryFilters): Promise<CampaignHistoryListResult> {
    const conditions: string[] = ['campaign_id = $1'];
    const params: unknown[] = [filters.campaignId];
    let paramIdx = 1;

    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      paramIdx++;
      conditions.push(`action = ANY($${paramIdx}::text[])`);
      params.push(actions);
    }

    if (filters.userId) {
      paramIdx++;
      conditions.push(`user_id = $${paramIdx}`);
      params.push(filters.userId);
    }

    if (filters.dateFrom) {
      paramIdx++;
      conditions.push(`created_at >= $${paramIdx}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramIdx++;
      conditions.push(`created_at <= $${paramIdx}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM campaign_history WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: entries } = await query<CampaignHistoryEntry>(
      `SELECT * FROM campaign_history
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${++paramIdx} OFFSET $${++paramIdx}`,
      [...params, limit, offset],
    );

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(entry: Omit<CampaignHistoryEntry, 'id' | 'createdAt'>): Promise<CampaignHistoryEntry> {
    const { rows } = await query<CampaignHistoryEntry>(
      `INSERT INTO campaign_history (
        campaign_id, user_id, user_name, action, details,
        previous_value, new_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        entry.campaignId, entry.userId, entry.userName, entry.action,
        entry.details, entry.previousValue, entry.newValue,
      ],
    );
    return rows[0];
  }
}
