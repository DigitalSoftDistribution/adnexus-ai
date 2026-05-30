import type { IScheduledReportRepository, ScheduledReportFilters, ScheduledReportListResult } from '../../domain/repositories/IScheduledReportRepository';
import type { ScheduledReport } from '../../domain/entities/ScheduledReport';
import { query } from '../database/connection';

export class ScheduledReportRepository implements IScheduledReportRepository {
  async findById(id: string): Promise<ScheduledReport | null> {
    const { rows } = await query<ScheduledReport>(`SELECT * FROM scheduled_reports WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<ScheduledReport | null> {
    const { rows } = await query<ScheduledReport>(
      `SELECT * FROM scheduled_reports WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async findDue(): Promise<ScheduledReport[]> {
    const { rows } = await query<ScheduledReport>(
      `SELECT * FROM scheduled_reports WHERE status = 'active' AND next_run_at <= NOW() ORDER BY next_run_at ASC`,
    );
    return rows;
  }

  async list(filters: ScheduledReportFilters): Promise<ScheduledReportListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }
    if (filters.reportType) {
      conditions.push(`report_type = $${++idx}`);
      params.push(filters.reportType);
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
      `SELECT COUNT(*)::text as count FROM scheduled_reports WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<ScheduledReport>(
      `SELECT * FROM scheduled_reports WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { reports: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> {
    const { rows } = await query<ScheduledReport>(
      `INSERT INTO scheduled_reports (workspace_id, name, description, report_type, config, schedule_cron, recipients, format, status, last_run_at, last_run_status, next_run_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        report.workspaceId, report.name, report.description, report.reportType,
        JSON.stringify(report.config), report.scheduleCron, report.recipients,
        report.format, report.status, report.lastRunAt, report.lastRunStatus,
        report.nextRunAt, report.createdBy,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = this.camelToSnake(key);
        const serialized = key === 'config' ? JSON.stringify(value) : value;
        setClauses.push(`${column} = $${++idx}`);
        params.push(serialized);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<ScheduledReport>(
      `UPDATE scheduled_reports SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM scheduled_reports WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async updateRunStatus(id: string, status: string, nextRunAt: Date | null): Promise<void> {
    await query(
      `UPDATE scheduled_reports SET last_run_at = NOW(), last_run_status = $2, next_run_at = $3 WHERE id = $1`,
      [id, status, nextRunAt],
    );
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM scheduled_reports WHERE workspace_id = $1`, [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
