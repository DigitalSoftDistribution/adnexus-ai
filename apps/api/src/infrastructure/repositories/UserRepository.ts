import type { IUserRepository, UserFilters, UserListResult } from '../../domain/repositories/IUserRepository';
import type { User, WorkspaceMember, WorkspaceRole } from '../../domain/entities/User';
import { query } from '../database/connection';

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const { rows } = await query<User>(
      `SELECT * FROM users WHERE id = ANY($1)`,
      [ids],
    );
    return rows;
  }

  async list(filters: UserFilters): Promise<UserListResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 0;

    if (filters.workspaceId) {
      conditions.push(`id IN (SELECT user_id FROM workspace_members WHERE workspace_id = $${++idx})`);
      params.push(filters.workspaceId);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${++idx} OR email ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM users ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: users } = await query<User>(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { rows } = await query<User>(
      `INSERT INTO users (email, name, avatar_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.email, user.name, user.avatarUrl],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
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

    const { rows } = await query<User>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM users WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async getWorkspaces(userId: string): Promise<WorkspaceMember[]> {
    const { rows } = await query<WorkspaceMember>(
      `SELECT * FROM workspace_members WHERE user_id = $1`,
      [userId],
    );
    return rows;
  }

  async getRoleInWorkspace(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const { rows } = await query<{ role: WorkspaceRole }>(
      `SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2 LIMIT 1`,
      [userId, workspaceId],
    );
    return rows[0]?.role ?? null;
  }
}
