import type { IAuditLogRepository, AuditLogFilters, AuditLogListResult, AuditLogSummary } from '../../domain/repositories/IAuditLogRepository';
import type { AuditLogEntry } from '../../domain/entities/AuditLogEntry';
import { query } from '../database/connection';

export class AuditLogRepository implements IAuditLogRepository {
  async list(filters: AuditLogFilters): Promise<AuditLogListResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 0;

    if (filters.workspaceId) {
      conditions.push(`workspace_id = $${++idx}`);
      params.push(filters.workspaceId);
    }
    if (filters.userId) {
      conditions.push(`user_id = $${++idx}`);
      params.push(filters.userId);
    }
    if (filters.actionCategory) {
      const categories = Array.isArray(filters.actionCategory) ? filters.actionCategory : [filters.actionCategory];
      conditions.push(`action_category = ANY($${++idx}::text[])`);
      params.push(categories);
    }
    if (filters.entityType) {
      conditions.push(`entity_type = $${++idx}`);
      params.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`entity_id = $${++idx}`);
      params.push(filters.entityId);
    }
    if (filters.campaignId) {
      conditions.push(`campaign_id = $${++idx}`);
      params.push(filters.campaignId);
    }
    if (filters.platform) {
      conditions.push(`platform = $${++idx}`);
      params.push(filters.platform);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${++idx}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${++idx}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: entries } = await query<AuditLogEntry>(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(workspaceId?: string): Promise<AuditLogSummary> {
    const workspaceCondition = workspaceId ? 'WHERE workspace_id = $1' : '';
    const params = workspaceId ? [workspaceId] : [];

    const { rows: totalRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${workspaceCondition}`,
      params,
    );

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { rows: todayRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${workspaceCondition} ${workspaceCondition ? 'AND' : 'WHERE'} created_at >= $${workspaceId ? 2 : 1}`,
      workspaceId ? [workspaceId, today] : [today],
    );

    const { rows: weekRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${workspaceCondition} ${workspaceCondition ? 'AND' : 'WHERE'} created_at >= $${workspaceId ? 2 : 1}`,
      workspaceId ? [workspaceId, weekAgo] : [weekAgo],
    );

    const { rows: actionRows } = await query<{ action_category: string; count: string }>(
      `SELECT action_category, COUNT(*)::text as count FROM audit_log ${workspaceCondition} GROUP BY action_category`,
      params,
    );

    const { rows: entityRows } = await query<{ entity_type: string; count: string }>(
      `SELECT entity_type, COUNT(*)::text as count FROM audit_log ${workspaceCondition} GROUP BY entity_type`,
      params,
    );

    const { rows: userRows } = await query<{ user_id: string; actor_name: string; count: string }>(
      `SELECT user_id, actor_name, COUNT(*)::text as count FROM audit_log ${workspaceCondition} GROUP BY user_id, actor_name ORDER BY COUNT(*) DESC LIMIT 10`,
      params,
    );

    return {
      totalEntries: parseInt(totalRows[0]?.count ?? '0', 10),
      entriesToday: parseInt(todayRows[0]?.count ?? '0', 10),
      entriesThisWeek: parseInt(weekRows[0]?.count ?? '0', 10),
      actionBreakdown: Object.fromEntries(actionRows.map((r) => [r.action_category ?? 'unknown', parseInt(r.count, 10)])),
      entityBreakdown: Object.fromEntries(entityRows.map((r) => [r.entity_type ?? 'unknown', parseInt(r.count, 10)])),
      topUsers: userRows.map((r) => ({ userId: r.user_id, userName: r.actor_name, count: parseInt(r.count, 10) })),
    };
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const { rows } = await query<AuditLogEntry>(
      `SELECT * FROM audit_log WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }
}
