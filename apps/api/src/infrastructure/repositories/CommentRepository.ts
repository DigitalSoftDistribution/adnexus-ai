import type { Comment } from '../../domain/entities/Comment';
import type { ICommentRepository, CommentFilters, CommentListResult } from '../../domain/repositories/ICommentRepository';
import { query } from '../database/connection';

export class CommentRepository implements ICommentRepository {
  async findById(id: string): Promise<Comment | null> {
    const { rows } = await query<Comment>(
      `SELECT c.id, d.workspace_id as "workspaceId", c.user_id as "userId", c.draft_id as "draftId",
              c.text, c.parent_id as "parentId", c.created_at as "createdAt", c.updated_at as "updatedAt"
       FROM comments c
       JOIN drafts d ON d.id = c.draft_id
       WHERE c.id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async list(filters: CommentFilters): Promise<CommentListResult> {
    const conditions: string[] = ['d.workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.draftId) {
      conditions.push(`c.draft_id = $${++idx}`);
      params.push(filters.draftId);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM comments c JOIN drafts d ON d.id = c.draft_id WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const { rows } = await query<Comment>(
      `SELECT c.id, d.workspace_id as "workspaceId", c.user_id as "userId", c.draft_id as "draftId",
              c.text, c.parent_id as "parentId", c.created_at as "createdAt", c.updated_at as "updatedAt"
       FROM comments c
       JOIN drafts d ON d.id = c.draft_id
       WHERE ${whereClause}
       ORDER BY c.created_at ASC
       LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { comments: rows, total, page, totalPages: Math.ceil(total / limit) || 1 };
  }

  async create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const { rows } = await query<Comment>(
      `INSERT INTO comments (draft_id, user_id, text, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, $5::uuid as "workspaceId", user_id as "userId", draft_id as "draftId",
                 text, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"`,
      [comment.draftId, comment.userId, comment.text, comment.parentId, comment.workspaceId],
    );
    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM comments WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
