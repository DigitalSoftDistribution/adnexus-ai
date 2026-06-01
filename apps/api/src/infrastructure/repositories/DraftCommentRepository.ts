import type { IDraftCommentRepository, DraftCommentListResult } from '../../domain/repositories/IDraftCommentRepository';
import type { DraftComment } from '../../domain/entities/DraftComment';
import { query } from '../database/connection';

export class DraftCommentRepository implements IDraftCommentRepository {
  async listByDraft(draftId: string, page?: number, limit?: number): Promise<DraftCommentListResult> {
    const p = page ?? 1;
    const l = Math.min(limit ?? 50, 100);
    const offset = (p - 1) * l;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM draft_comments WHERE draft_id = $1`,
      [draftId],
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: comments } = await query<DraftComment>(
      `SELECT * FROM draft_comments
       WHERE draft_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [draftId, l, offset],
    );

    return { comments, total };
  }

  async findById(id: string): Promise<DraftComment | null> {
    const { rows } = await query<DraftComment>(
      `SELECT * FROM draft_comments WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(comment: Omit<DraftComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DraftComment> {
    const { rows } = await query<DraftComment>(
      `INSERT INTO draft_comments (draft_id, user_id, user_name, user_avatar, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [comment.draftId, comment.userId, comment.userName, comment.userAvatar, comment.content],
    );
    return rows[0];
  }

  async update(id: string, content: string): Promise<DraftComment | null> {
    const { rows } = await query<DraftComment>(
      `UPDATE draft_comments SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [content, id],
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM draft_comments WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
