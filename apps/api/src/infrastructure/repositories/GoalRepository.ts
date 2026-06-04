import type { IGoalRepository } from '../../domain/repositories/IGoalRepository';
import type { Goal, GoalFilters, GoalListResult, GoalProgress, GoalMetric, GoalPeriod, GoalStatus } from '../../domain/entities/Goal';
import { query } from '../database/connection';

// The live `goals` table stores: goal_type, platform, target_value,
// current_value, baseline_value, unit, start_date, end_date, status,
// campaign_ids (text[]), alert_when. It has no metric/period/description/
// campaign_id/alert_threshold columns, so we map between that shape and the
// domain Goal entity here.
interface GoalRow {
  id: string;
  workspace_id: string;
  name: string;
  goal_type: string;
  platform: string | null;
  target_value: string | number;
  current_value: string | number | null;
  baseline_value: string | number | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  campaign_ids: string[] | null;
  alert_when: number | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(r: GoalRow): Goal {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    campaignId: Array.isArray(r.campaign_ids) && r.campaign_ids.length > 0 ? r.campaign_ids[0] : null,
    name: r.name,
    description: null,
    metric: r.goal_type as GoalMetric,
    targetValue: Number(r.target_value ?? 0),
    currentValue: Number(r.current_value ?? 0),
    period: 'campaign_lifetime' as GoalPeriod,
    status: r.status as GoalStatus,
    startDate: r.start_date,
    endDate: r.end_date,
    alertThreshold: r.alert_when ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class GoalRepository implements IGoalRepository {
  async findById(id: string): Promise<Goal | null> {
    const { rows } = await query<GoalRow>(
      `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Goal | null> {
    const { rows } = await query<GoalRow>(
      `SELECT * FROM goals WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async list(filters: GoalFilters): Promise<GoalListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let paramIdx = 1;

    if (filters.campaignId) {
      paramIdx++;
      conditions.push(`$${paramIdx} = ANY(campaign_ids)`);
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
      conditions.push(`goal_type = ANY($${paramIdx}::text[])`);
      params.push(metrics);
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

    const { rows } = await query<GoalRow>(
      `SELECT * FROM goals WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++paramIdx} OFFSET $${++paramIdx}`,
      [...params, limit, offset],
    );

    return {
      goals: rows.map(mapRow),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const campaignIds = goal.campaignId ? [goal.campaignId] : [];
    // The live goals table requires start_date/end_date and constrains status
    // to active|completed|paused|at_risk|off_track and alert_when to
    // at_risk|off_track|never. Provide safe defaults so the domain entity's
    // looser values still persist.
    const now = new Date();
    const startDate = goal.startDate ?? now.toISOString().slice(0, 10);
    const endDate = goal.endDate ?? new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const status = ['active', 'completed', 'paused', 'at_risk', 'off_track'].includes(goal.status)
      ? goal.status
      : 'active';
    const goalType = ['roas', 'cpa', 'ctr', 'spend', 'conversions'].includes(goal.metric)
      ? goal.metric
      : 'custom';

    const { rows } = await query<GoalRow>(
      `INSERT INTO goals (
        workspace_id, name, goal_type, target_value, current_value,
        status, start_date, end_date, campaign_ids, alert_when
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        goal.workspaceId, goal.name, goalType,
        goal.targetValue, goal.currentValue ?? 0, status,
        startDate, endDate, campaignIds, 'at_risk',
      ],
    );
    return mapRow(rows[0]);
  }

  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    // Map entity fields to the live column names.
    const columnFor: Record<string, string> = {
      name: 'name',
      metric: 'goal_type',
      targetValue: 'target_value',
      currentValue: 'current_value',
      status: 'status',
      startDate: 'start_date',
      endDate: 'end_date',
      alertThreshold: 'alert_when',
    };
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      const column = columnFor[key];
      if (column && value !== undefined) {
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<GoalRow>(
      `UPDATE goals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM goals WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async getProgress(goalId: string): Promise<GoalProgress | null> {
    const { rows } = await query<GoalRow>(
      `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
      [goalId],
    );

    if (!rows[0]) return null;
    const goal = mapRow(rows[0]);

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
}
