import type { IGoalRepository, GoalFilters, GoalListResult } from '../../domain/repositories/IGoalRepository';
import type { Goal } from '../../domain/entities/Goal';
import { query } from '../database/connection';

export class GoalRepository implements IGoalRepository {
  async findById(id: string): Promise<Goal | null> {
    const { rows } = await query<Goal>(`SELECT * FROM goals WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Goal | null> {
    const { rows } = await query<Goal>(
      `SELECT * FROM goals WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: GoalFilters): Promise<GoalListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }
    if (filters.metricType) {
      conditions.push(`metric_type = $${++idx}`);
      params.push(filters.metricType);
    }
    if (filters.platform) {
      conditions.push(`platform = $${++idx}`);
      params.push(filters.platform);
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
      `SELECT COUNT(*)::text as count FROM goals WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<Goal>(
      `SELECT * FROM goals WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { goals: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const { rows } = await query<Goal>(
      `INSERT INTO goals (workspace_id, name, description, metric_type, target_value, current_value, campaign_ids, platform, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        goal.workspaceId, goal.name, goal.description, goal.metricType,
        goal.targetValue, goal.currentValue, goal.campaignIds, goal.platform,
        goal.startDate, goal.endDate, goal.status, goal.createdBy,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`${this.camelToSnake(key)} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Goal>(
      `UPDATE goals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM goals WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async updateProgress(id: string, currentValue: number): Promise<Goal | null> {
    const { rows } = await query<Goal>(
      `UPDATE goals SET current_value = $2 WHERE id = $1 RETURNING *`, [id, currentValue],
    );
    return rows[0] ?? null;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM goals WHERE workspace_id = $1`, [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
