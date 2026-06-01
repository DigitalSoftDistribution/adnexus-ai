import type { IWorkspaceRepository, WorkspaceFilters, WorkspaceListResult } from '../../domain/repositories/IWorkspaceRepository';
import type { Workspace, WorkspaceLimits, PlanTier } from '../../domain/entities/Workspace';
import type { WorkspaceMember, WorkspaceRole } from '../../domain/entities/User';
import { PLAN_LIMITS } from '../../domain/entities/Workspace';
import { query } from '../database/connection';

export class WorkspaceRepository implements IWorkspaceRepository {
  async findById(id: string): Promise<Workspace | null> {
    const { rows } = await query<Workspace>(
      `SELECT * FROM workspaces WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const { rows } = await query<Workspace>(
      `SELECT * FROM workspaces WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  }

  async findByOwnerId(ownerId: string): Promise<Workspace[]> {
    const { rows } = await query<Workspace>(
      `SELECT * FROM workspaces WHERE owner_id = $1`,
      [ownerId],
    );
    return rows;
  }

  async list(filters: WorkspaceFilters): Promise<WorkspaceListResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 0;

    if (filters.status) {
      conditions.push(`subscription_status = $${++idx}`);
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${++idx} OR slug ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM workspaces ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: workspaces } = await query<Workspace>(
      `SELECT * FROM workspaces ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { workspaces, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const { rows } = await query<Workspace>(
      `INSERT INTO workspaces (name, slug, plan, owner_id, stripe_customer_id, stripe_subscription_id,
        subscription_status, current_period_start, current_period_end, cancel_at_period_end, branding, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        workspace.name, workspace.slug, workspace.plan, workspace.ownerId,
        workspace.stripeCustomerId, workspace.stripeSubscriptionId, workspace.subscriptionStatus,
        workspace.currentPeriodStart, workspace.currentPeriodEnd, workspace.cancelAtPeriodEnd,
        workspace.branding, workspace.settings,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Workspace>(
      `UPDATE workspaces SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM workspaces WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  // Members
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { rows } = await query<WorkspaceMember>(
      `SELECT * FROM workspace_members WHERE workspace_id = $1`,
      [workspaceId],
    );
    return rows;
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const { rows } = await query<WorkspaceMember>(
      `SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 LIMIT 1`,
      [workspaceId, userId],
    );
    return rows[0] ?? null;
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole, invitedBy: string): Promise<WorkspaceMember> {
    const { rows } = await query<WorkspaceMember>(
      `INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, invited_at, joined_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [workspaceId, userId, role, invitedBy],
    );
    return rows[0];
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember | null> {
    const { rows } = await query<WorkspaceMember>(
      `UPDATE workspace_members SET role = $3, updated_at = NOW()
       WHERE workspace_id = $1 AND user_id = $2
       RETURNING *`,
      [workspaceId, userId, role],
    );
    return rows[0] ?? null;
  }

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const { rowCount } = await query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  // Limits
  async getLimits(workspaceId: string): Promise<WorkspaceLimits> {
    const { rows } = await query<{ plan: PlanTier }>(
      `SELECT plan FROM workspaces WHERE id = $1`,
      [workspaceId],
    );
    const plan = rows[0]?.plan ?? 'free';
    return PLAN_LIMITS[plan];
  }

  async checkLimit(workspaceId: string, resource: keyof WorkspaceLimits): Promise<boolean> {
    const limits = await this.getLimits(workspaceId);
    const max = limits[resource];

    const tableMap: Record<string, string> = {
      maxCampaigns: 'campaigns',
      maxAdAccounts: 'ad_accounts',
      maxUsers: 'workspace_members',
      maxAutomations: 'automation_rules',
      maxApiKeys: 'api_keys',
    };

    const table = tableMap[resource];
    if (!table) return true;

    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM ${table} WHERE workspace_id = $1`,
      [workspaceId],
    );

    const current = parseInt(rows[0]?.count ?? '0', 10);
    return current < max;
  }
}
