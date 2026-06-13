import type { IDraftRepository, DraftFilters, DraftListResult, DraftStats } from '../../domain/repositories/IDraftRepository';
import type { Draft, DraftStatus } from '../../domain/entities/Draft';
import { query } from '../database/connection';

export class DraftRepository implements IDraftRepository {
  async findById(id: string): Promise<Draft | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM drafts WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Draft | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM drafts WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
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

    const { rows: draftRows } = await query<Record<string, unknown>>(dataQuery, params);
    const drafts = draftRows.map((r) => this.mapRow(r));

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
    // Real `drafts` columns only: there is no approved_by/approved_at/updated_at;
    // approval is tracked via approver_id/approval_note/resolved_at.
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO drafts (
        workspace_id, platform, campaign_id, adset_id, ad_id,
        draft_type, change_summary, change_detail, ai_reasoning,
        impact_estimate, actor_type, actor_id, actor_name, rule_id,
        status, approver_id, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        draft.workspaceId, draft.platform, draft.campaignId, draft.adsetId, draft.adId,
        draft.draftType, draft.changeSummary, draft.changeDetail, draft.aiReasoning,
        draft.impactEstimate, draft.actorType, draft.actorId, draft.actorName, draft.ruleId,
        draft.status, draft.approvedBy, draft.executedAt,
      ],
    );
    return this.mapRow(rows[0]);
  }

  async updateStatus(id: string, status: DraftStatus, metadata?: Record<string, unknown>): Promise<Draft | null> {
    const setExtra = status === 'executed'
      ? ', executed_at = NOW(), resolved_at = NOW()'
      : (status === 'rejected' || status === 'rolled_back' || status === 'failed')
        ? ', resolved_at = NOW()'
        : '';
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE drafts SET status = $2${setExtra}${metadata ? ', change_detail = change_detail || $3::jsonb' : ''}
       WHERE id = $1 RETURNING *`,
      metadata ? [id, status, JSON.stringify(metadata)] : [id, status],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async claimStatus(
    id: string,
    fromStatus: DraftStatus,
    toStatus: DraftStatus,
    metadata?: Record<string, unknown>,
  ): Promise<Draft | null> {
    const setExtra = toStatus === 'executed'
      ? ', executed_at = NOW(), resolved_at = NOW()'
      : (toStatus === 'rejected' || toStatus === 'rolled_back' || toStatus === 'failed')
        ? ', resolved_at = NOW()'
        : '';
    // The `AND status = $3` makes this a compare-and-set: only one concurrent
    // caller can move the row out of `fromStatus`; the loser gets zero rows.
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE drafts SET status = $2${setExtra}${metadata ? ', change_detail = change_detail || $4::jsonb' : ''}
       WHERE id = $1 AND status = $3 RETURNING *`,
      metadata ? [id, toStatus, fromStatus, JSON.stringify(metadata)] : [id, toStatus, fromStatus],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async approve(id: string, approvedBy: string): Promise<Draft | null> {
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE drafts SET status = 'approved', approver_id = $2, resolved_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, approvedBy],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async reject(id: string, rejectedBy: string, reason?: string): Promise<Draft | null> {
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE drafts SET status = 'rejected', approver_id = $2, approval_note = $4, resolved_at = NOW(),
              change_detail = change_detail || $3::jsonb
       WHERE id = $1 RETURNING *`,
      [id, rejectedBy, JSON.stringify({ rejectedBy, rejectedAt: new Date().toISOString(), reason }), reason ?? null],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
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

  /** Map a snake_case drafts row to the camelCase Draft entity. */
  private mapRow(r: Record<string, unknown>): Draft {
    return {
      id: r.id as string,
      workspaceId: r.workspace_id as string,
      platform: (r.platform ?? 'all') as Draft['platform'],
      campaignId: (r.campaign_id ?? null) as string | null,
      adsetId: (r.adset_id ?? null) as string | null,
      adId: (r.ad_id ?? null) as string | null,
      draftType: r.draft_type as Draft['draftType'],
      changeSummary: (r.change_summary ?? '') as string,
      changeDetail: (r.change_detail ?? {}) as Record<string, unknown>,
      aiReasoning: (r.ai_reasoning ?? null) as string | null,
      impactEstimate: (r.impact_estimate ?? null) as string | null,
      actorType: (r.actor_type ?? 'user') as Draft['actorType'],
      actorId: (r.actor_id ?? null) as string | null,
      actorName: (r.actor_name ?? null) as string | null,
      ruleId: (r.rule_id ?? null) as string | null,
      status: r.status as Draft['status'],
      approvedBy: (r.approver_id ?? null) as string | null,
      approvedAt: (r.resolved_at ?? null) as Date | null,
      executedAt: (r.executed_at ?? null) as Date | null,
      createdAt: (r.created_at ?? new Date()) as Date,
      updatedAt: (r.resolved_at ?? r.created_at ?? new Date()) as Date,
    };
  }
}
