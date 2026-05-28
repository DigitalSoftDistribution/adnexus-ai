import type { IDraftRepository, DraftFilters, DraftListResult, DraftStats } from '../../domain/repositories/IDraftRepository';
import type { Draft, DraftStatus } from '../../domain/entities/Draft';
import { query } from '../database/connection';

export class DraftRepository implements IDraftRepository {
  async findById(id: string): Promise<Draft | null> {
    const { rows } = await query<Draft>(
      `SELECT * FROM drafts WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Draft | null> {
    const { rows } = await query<Draft>(
      `SELECT * FROM drafts WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: DraftFilters): Promise<DraftListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let paramIdx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      paramIdx++;
      conditions.push(`status = ANY($${paramIdx}::text[])`);
      params.push(statuses);
    }

    if (filters.platform) {
      paramIdx++;
      conditions.push(`platform = $${paramIdx}`);
      params.push(filters.platform);
    }

    if (filters.draftType) {
      const types = Array.isArray(filters.draftType) ? filters.draftType : [filters.draftType];
      paramIdx++;
      conditions.push(`draft_type = ANY($${paramIdx}::text[])`);
      params.push(types);
    }

    if (filters.campaignId) {
      paramIdx++;
      conditions.push(`campaign_id = $${paramIdx}`);
      params.push(filters.campaignId);
    }

    if (filters.actorType) {
      paramIdx++;
      conditions.push(`actor_type = $${paramIdx}`);
      params.push(filters.actorType);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM drafts WHERE ${whereClause}`;
    const { rows: countRows } = await query<{ count: string }>(countQuery, params);
    const total = parseInt(countRows[0].count, 10);

    const dataQuery = `
      SELECT * FROM drafts
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramIdx} OFFSET $${++paramIdx}
    `;
    params.push(limit, offset);

    const { rows: drafts } = await query<Draft>(dataQuery, params);

    return { drafts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats(workspaceId: string): Promise<DraftStats> {
    const { rows } = await query<DraftStats>(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COUNT(*) FILTER (WHERE status = 'executed')::int as executed,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE status = 'rolled_back')::int as rolled_back
      FROM drafts WHERE workspace_id = $1`,
      [workspaceId],
    );
    return rows[0] ?? { total: 0, pending: 0, approved: 0, rejected: 0, executed: 0, failed: 0, rolledBack: 0 };
  }

  async create(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> {
    const { rows } = await query<Draft>(
      `INSERT INTO drafts (
        workspace_id, platform, campaign_id, adset_id, ad_id,
        draft_type, change_summary, change_detail, ai_reasoning,
        impact_estimate, actor_type, actor_id, actor_name, rule_id,
        status, approved_by, approved_at, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        draft.workspaceId, draft.platform, draft.campaignId, draft.adsetId, draft.adId,
        draft.draftType, draft.changeSummary, draft.changeDetail, draft.aiReasoning,
        draft.impactEstimate, draft.actorType, draft.actorId, draft.actorName, draft.ruleId,
        draft.status, draft.approvedBy, draft.approvedAt, draft.executedAt,
      ],
    );
    return rows[0];
  }

  async updateStatus(id: string, status: DraftStatus, metadata?: Record<string, unknown>): Promise<Draft | null> {
    const { rows } = await query<Draft>(
      `UPDATE drafts SET status = $2, updated_at = NOW() ${metadata ? `, change_detail = change_detail || $3::jsonb` : ''}
       WHERE id = $1 RETURNING *`,
      metadata ? [id, status, JSON.stringify(metadata)] : [id, status],
    );
    return rows[0] ?? null;
  }

  async approve(id: string, approvedBy: string): Promise<Draft | null> {
    const { rows } = await query<Draft>(
      `UPDATE drafts SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, approvedBy],
    );
    return rows[0] ?? null;
  }

  async reject(id: string, rejectedBy: string, reason?: string): Promise<Draft | null> {
    const { rows } = await query<Draft>(
      `UPDATE drafts SET status = 'rejected', change_detail = change_detail || $3::jsonb, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, rejectedBy, JSON.stringify({ rejectedBy, rejectedAt: new Date().toISOString(), reason })],
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM drafts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM drafts WHERE workspace_id = $1`,
      [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }
}
