import type { IAlertRepository, Alert, AlertFilters, AlertListResult, AlertHistoryEntry } from '../../domain/repositories/IAlertRepository';
import { query } from '../database/connection';

export class AlertRepository implements IAlertRepository {
  async list(filters: AlertFilters): Promise<AlertListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.type) {
      conditions.push(`type = $${++idx}`);
      params.push(filters.type);
    }
    if (filters.enabled !== undefined) {
      conditions.push(`enabled = $${++idx}`);
      params.push(filters.enabled);
    }

    const where = conditions.join(' AND ');

    const { rows } = await query<Alert>(
      `SELECT * FROM alerts WHERE ${where} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM alerts WHERE ${where}`,
      params,
    );

    return {
      alerts: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Alert | null> {
    const { rows } = await query<Alert>(
      `SELECT * FROM alerts WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Alert | null> {
    const { rows } = await query<Alert>(
      `SELECT * FROM alerts WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async create(alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Alert> {
    const { rows } = await query<Alert>(
      `INSERT INTO alerts (workspace_id, name, type, metric, operator, threshold, enabled, channels, last_triggered_at, trigger_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        alert.workspaceId, alert.name, alert.type, alert.metric, alert.operator,
        alert.threshold, alert.enabled, JSON.stringify(alert.channels),
        alert.lastTriggeredAt, alert.triggerCount,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Alert>): Promise<Alert | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    if (updates.name !== undefined) { setClauses.push(`name = $${++idx}`); params.push(updates.name); }
    if (updates.type !== undefined) { setClauses.push(`type = $${++idx}`); params.push(updates.type); }
    if (updates.metric !== undefined) { setClauses.push(`metric = $${++idx}`); params.push(updates.metric); }
    if (updates.operator !== undefined) { setClauses.push(`operator = $${++idx}`); params.push(updates.operator); }
    if (updates.threshold !== undefined) { setClauses.push(`threshold = $${++idx}`); params.push(updates.threshold); }
    if (updates.enabled !== undefined) { setClauses.push(`enabled = $${++idx}`); params.push(updates.enabled); }
    if (updates.channels !== undefined) { setClauses.push(`channels = $${++idx}`); params.push(JSON.stringify(updates.channels)); }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Alert>(
      `UPDATE alerts SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM alerts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async toggle(id: string, enabled: boolean): Promise<Alert | null> {
    const { rows } = await query<Alert>(
      `UPDATE alerts SET enabled = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, enabled],
    );
    return rows[0] ?? null;
  }

  async getHistory(alertId: string): Promise<AlertHistoryEntry[]> {
    const { rows } = await query<AlertHistoryEntry>(
      `SELECT * FROM alert_history WHERE alert_id = $1 ORDER BY triggered_at DESC`,
      [alertId],
    );
    return rows;
  }

  async addHistory(entry: Omit<AlertHistoryEntry, 'id'>): Promise<AlertHistoryEntry> {
    const { rows } = await query<AlertHistoryEntry>(
      `INSERT INTO alert_history (alert_id, triggered_at, metric_value, message, acknowledged)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [entry.alertId, entry.triggeredAt, entry.metricValue, entry.message, entry.acknowledged],
    );
    return rows[0];
  }
}
