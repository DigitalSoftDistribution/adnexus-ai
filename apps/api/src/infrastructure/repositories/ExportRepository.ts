import type { IExportRepository } from '../../domain/repositories/IExportRepository';
import type { Export, ExportFilters, ExportListResult } from '../../domain/entities/Export';
import { query } from '../database/connection';

export class ExportRepository implements IExportRepository {
  async findById(id: string): Promise<Export | null> {
    const { rows } = await query<Export>(
      `SELECT * FROM exports WHERE id = $1 LIMIT 1`, [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Export | null> {
    const { rows } = await query<Export>(
      `SELECT * FROM exports WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: ExportFilters): Promise<ExportListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }
    if (filters.entity) {
      const entities = Array.isArray(filters.entity) ? filters.entity : [filters.entity];
      conditions.push(`entity = ANY($${++idx}::text[])`);
      params.push(entities);
    }
    if (filters.format) {
      const formats = Array.isArray(filters.format) ? filters.format : [filters.format];
      conditions.push(`format = ANY($${++idx}::text[])`);
      params.push(formats);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM exports WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: exports } = await query<Export>(
      `SELECT * FROM exports WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { exports, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(exportItem: Omit<Export, 'id' | 'createdAt' | 'updatedAt'>): Promise<Export> {
    const { rows } = await query<Export>(
      `INSERT INTO exports (workspace_id, name, entity, format, status, filters, file_url, file_size, row_count, error_message, created_by, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        exportItem.workspaceId, exportItem.name, exportItem.entity, exportItem.format,
        exportItem.status, JSON.stringify(exportItem.filters), exportItem.fileUrl,
        exportItem.fileSize, exportItem.rowCount, exportItem.errorMessage,
        exportItem.createdBy, exportItem.completedAt,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Export>): Promise<Export | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = this.camelToSnake(key);
        const serialized = key === 'filters' ? JSON.stringify(value) : value;
        setClauses.push(`${column} = $${++paramIdx}`);
        params.push(serialized);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Export>(
      `UPDATE exports SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM exports WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
