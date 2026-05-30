import type { ICommentRepository, CommentFilters, CommentListResult } from '../../domain/repositories/ICommentRepository';
import type { Comment } from '../../domain/entities/Comment';
import { query } from '../database/connection';

export class CommentRepository implements ICommentRepository {
  async findById(id: string): Promise<Comment | null> {
    const { rows } = await query<Comment>(`SELECT * FROM comments WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ?? null;
  }

  async findByDraft(draftId: string): Promise<Comment[]> {
    const { rows } = await query<Comment>(
      `SELECT * FROM comments WHERE draft_id = $1 ORDER BY created_at ASC`, [draftId],
    );
    return rows;
  }

  async findByParent(parentId: string): Promise<Comment[]> {
    const { rows } = await query<Comment>(
      `SELECT * FROM comments WHERE parent_id = $1 ORDER BY created_at ASC`, [parentId],
    );
    return rows;
  }

  async list(filters: CommentFilters): Promise<CommentListResult> {
    const conditions: string[] = ['draft_id = $1'];
    const params: unknown[] = [filters.draftId];
    let idx = 1;

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(`parent_id IS NULL`);
      } else {
        conditions.push(`parent_id = $${++idx}`);
        params.push(filters.parentId);
      }
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM comments WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<Comment>(
      `SELECT * FROM comments WHERE ${whereClause} ORDER BY created_at ASC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { comments: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const { rows } = await query<Comment>(
      `INSERT INTO comments (draft_id, user_id, text, parent_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [comment.draftId, comment.userId, comment.text, comment.parentId],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Comment>): Promise<Comment | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Comment>(
      `UPDATE comments SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM comments WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByDraft(draftId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM comments WHERE draft_id = $1`, [draftId],
    );
    return parseInt(rows[0].count, 10);
  }
}
