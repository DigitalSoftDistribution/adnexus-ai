import type { IReportRepository, Report, ReportFilters, ReportListResult } from '../../domain/repositories/IReportRepository';
import { query } from '../database/connection';

export class ReportRepository implements IReportRepository {
  async list(filters: ReportFilters): Promise<ReportListResult> {
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

    const where = conditions.join(' AND ');

    const { rows } = await query<Report>(
      `SELECT * FROM reports WHERE ${where} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM reports WHERE ${where}`,
      params,
    );

    return {
      reports: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Report | null> {
    const { rows } = await query<Report>(
      `SELECT * FROM reports WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Report | null> {
    const { rows } = await query<Report>(
      `SELECT * FROM reports WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const { rows } = await query<Report>(
      `INSERT INTO reports (workspace_id, name, type, config, schedule, last_run_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        report.workspaceId, report.name, report.type,
        JSON.stringify(report.config),
        report.schedule ? JSON.stringify(report.schedule) : null,
        report.lastRunAt,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Report>): Promise<Report | null> {
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
    if (updates.config !== undefined) {
      setClauses.push(`config = $${++idx}`);
      params.push(JSON.stringify(updates.config));
    }
    if (updates.schedule !== undefined) {
      setClauses.push(`schedule = $${++idx}`);
      params.push(updates.schedule ? JSON.stringify(updates.schedule) : null);
    }
    if (updates.lastRunAt !== undefined) {
      setClauses.push(`last_run_at = $${++idx}`);
      params.push(updates.lastRunAt);
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Report>(
      `UPDATE reports SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM reports WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async runReport(reportId: string): Promise<Record<string, unknown>> {
    // Placeholder — would generate actual report data
    return {
      reportId,
      generatedAt: new Date().toISOString(),
      data: [],
    };
  }
}
