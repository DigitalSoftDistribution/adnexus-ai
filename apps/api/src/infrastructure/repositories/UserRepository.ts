import type { IUserRepository } from '../../domain/repositories/IUserRepository';
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
