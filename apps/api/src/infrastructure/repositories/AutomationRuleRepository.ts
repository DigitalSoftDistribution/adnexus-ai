import type { IAutomationRuleRepository, AutomationRuleFilters, AutomationRuleListResult } from '../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../domain/entities/AutomationRule';
import { query } from '../database/connection';

export class AutomationRuleRepository implements IAutomationRuleRepository {
  async findById(id: string): Promise<AutomationRule | null> {
    const { rows } = await query<AutomationRule>(
      `SELECT * FROM automation_rules WHERE id = $1 LIMIT 1`, [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<AutomationRule | null> {
    const { rows } = await query<AutomationRule>(
      `SELECT * FROM automation_rules WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: AutomationRuleFilters): Promise<AutomationRuleListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }
    if (filters.triggerType) {
      conditions.push(`trigger_type = $${++idx}`);
      params.push(filters.triggerType);
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
      `SELECT COUNT(*)::text as count FROM automation_rules WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<AutomationRule>(
      `SELECT * FROM automation_rules WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { rules: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule> {
    const { rows } = await query<AutomationRule>(
      `INSERT INTO automation_rules (workspace_id, name, description, trigger_type, trigger_conditions, action_type, action_config, status, last_triggered_at, trigger_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        rule.workspaceId, rule.name, rule.description, rule.triggerType,
        JSON.stringify(rule.triggerConditions), rule.actionType,
        JSON.stringify(rule.actionConfig), rule.status, rule.lastTriggeredAt,
        rule.triggerCount, rule.createdBy,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = this.camelToSnake(key);
        const serialized = (key === 'triggerConditions' || key === 'actionConfig') ? JSON.stringify(value) : value;
        setClauses.push(`${column} = $${++idx}`);
        params.push(serialized);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<AutomationRule>(
      `UPDATE automation_rules SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM automation_rules WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async updateTriggerCount(id: string): Promise<void> {
    await query(
      `UPDATE automation_rules SET trigger_count = trigger_count + 1, last_triggered_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM automation_rules WHERE workspace_id = $1`, [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
