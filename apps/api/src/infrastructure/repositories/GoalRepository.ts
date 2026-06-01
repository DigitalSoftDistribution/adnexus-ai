import type { IGoalRepository } from '../../domain/repositories/IGoalRepository';
import type { Goal, GoalFilters, GoalListResult, GoalProgress } from '../../domain/entities/Goal';
import { query } from '../database/connection';

export class GoalRepository implements IGoalRepository {
  async findById(id: string): Promise<Goal | null> {
    const { rows } = await query<Goal>(
      `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Goal | null> {
    const { rows } = await query<Goal>(
      `SELECT * FROM goals WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: GoalFilters): Promise<GoalListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let paramIdx = 1;

    if (filters.campaignId) {
      paramIdx++;
      conditions.push(`campaign_id = $${paramIdx}`);
      params.push(filters.campaignId);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      paramIdx++;
      conditions.push(`status = ANY($${paramIdx}::text[])`);
      params.push(statuses);
    }

    if (filters.metric) {
      const metrics = Array.isArray(filters.metric) ? filters.metric : [filters.metric];
      paramIdx++;
      conditions.push(`metric = ANY($${paramIdx}::text[])`);
      params.push(metrics);
    }

    if (filters.period) {
      const periods = Array.isArray(filters.period) ? filters.period : [filters.period];
      paramIdx++;
      conditions.push(`period = ANY($${paramIdx}::text[])`);
      params.push(periods);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM goals WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: goals } = await query<Goal>(
      `SELECT * FROM goals WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++paramIdx} OFFSET $${++paramIdx}`,
      [...params, limit, offset],
    );

    return {
      goals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const { rows } = await query<Goal>(
      `INSERT INTO goals (
        workspace_id, campaign_id, name, description, metric,
        target_value, current_value, period, status, start_date, end_date, alert_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        goal.workspaceId, goal.campaignId, goal.name, goal.description, goal.metric,
        goal.targetValue, goal.currentValue, goal.period, goal.status,
        goal.startDate, goal.endDate, goal.alertThreshold,
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
        const column = this.camelToSnake(key);
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Goal>(
      `UPDATE goals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM goals WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async getProgress(goalId: string): Promise<GoalProgress | null> {
    const { rows } = await query<Goal>(
      `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
      [goalId],
    );

    const goal = rows[0];
    if (!goal) return null;

    const percentage = goal.targetValue > 0
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : 0;

    const remaining = Math.max(0, goal.targetValue - goal.currentValue);
    const isOnTrack = percentage >= 50;

    let daysRemaining: number | null = null;
    if (goal.endDate) {
      const end = new Date(goal.endDate);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      goalId: goal.id,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      percentage,
      remaining,
      isOnTrack,
      projectedValue: null,
      daysRemaining,
      trend: goal.currentValue > goal.targetValue * 0.5 ? 'up' : goal.currentValue > 0 ? 'flat' : 'down',
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
