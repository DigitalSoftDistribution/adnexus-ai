import type { IAuditLogRepository, AuditLogFilters, AuditLogListResult } from '../../domain/repositories/IAuditLogRepository';
import type { AuditLog } from '../../domain/entities/AuditLog';
import { query } from '../database/connection';

export class AuditLogRepository implements IAuditLogRepository {
  async create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const { rows } = await query<AuditLog>(
      `INSERT INTO audit_log (workspace_id, user_id, actor_type, actor_id, actor_name, action, action_category, platform, campaign_id, entity_type, entity_id, metadata, details, source, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        log.workspaceId, log.userId, log.actorType, log.actorId, log.actorName,
        log.action, log.actionCategory, log.platform, log.campaignId,
        log.entityType, log.entityId,
        log.metadata ? JSON.stringify(log.metadata) : null,
        log.details ? JSON.stringify(log.details) : null,
        log.source, log.ipAddress,
      ],
    );
    return rows[0];
  }

  async findByWorkspace(workspaceId: string, filters?: Omit<AuditLogFilters, 'workspaceId'>): Promise<AuditLogListResult> {
    return this.list({ workspaceId, ...filters });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const { rows } = await query<AuditLog>(
      `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 100`,
      [entityType, entityId],
    );
    return rows;
  }

  async findByUser(userId: string, filters?: Omit<AuditLogFilters, 'userId'>): Promise<AuditLogListResult> {
    return this.list({ userId, ...filters });
  }

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
    if (filters.entityType) {
      conditions.push(`entity_type = $${++idx}`);
      params.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`entity_id = $${++idx}`);
      params.push(filters.entityId);
    }
    if (filters.actionCategory) {
      conditions.push(`action_category = $${++idx}`);
      params.push(filters.actionCategory);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${++idx}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${++idx}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<AuditLog>(
      `SELECT * FROM audit_log WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { logs: rows, total, page, totalPages: Math.ceil(total / limit) };
  }
}
