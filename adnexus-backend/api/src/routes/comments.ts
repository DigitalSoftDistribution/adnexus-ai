// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authenticate, requireAuth } from '../middleware/auth';

const router = Router();

// ── Validation ──────────────────────────────────────────────
const createCommentSchema = z.object({
  text: z.string().min(1).max(5000),
  parentId: z.string().uuid().nullable().optional(),
});

// ── Helpers ─────────────────────────────────────────────────
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
}

// ── GET /drafts/:id/comments ──────────────────────────────
// List all comments for a draft, threaded by parent_id
router.get('/drafts/:id/comments', authenticate, async (req, res) => {
  const draftId = req.params.id;

  try {
    const rows = await db.query(
      `
        SELECT
          c.id,
          c.draft_id,
          c.user_id,
          c.text,
          c.parent_id,
          c.created_at,
          c.updated_at,
          u.name  AS user_name,
          u.email AS user_email,
          u.avatar_url AS user_avatar
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.draft_id = $1
        ORDER BY c.created_at ASC
      `,
      [draftId]
    );

    // Build threaded structure: top-level + nested replies
    const comments: any[] = [];
    const replyMap: Record<string, any[]> = {};

    for (const row of rows) {
      const comment = {
        id: row.id,
        draftId: row.draft_id,
        userId: row.user_id,
        text: row.text,
        parentId: row.parent_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        relativeTime: timeAgo(row.created_at),
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          avatar: row.user_avatar,
          initials: getInitials(row.user_name),
        },
        replies: [] as any[],
      };

      if (row.parent_id) {
        if (!replyMap[row.parent_id]) replyMap[row.parent_id] = [];
        replyMap[row.parent_id].push(comment);
      } else {
        comments.push(comment);
      }
    }

    // Attach replies to their parent comments (1-level nesting)
    for (const comment of comments) {
      if (replyMap[comment.id]) {
        comment.replies = replyMap[comment.id].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    }

    res.json({ draftId, comments });
  } catch (err) {
    console.error('[GET /drafts/:id/comments]', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// ── POST /drafts/:id/comments ─────────────────────────────
// Add a new comment (optionally as a reply)
router.post(
  '/drafts/:id/comments',
  requireAuth,
  async (req, res) => {
    const draftId = req.params.id;
    const userId = req.user!.id;

    const parse = createCommentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { text, parentId } = parse.data;

    // If replying, validate parent belongs to same draft
    if (parentId) {
      const parentCheck = await db.query(
        'SELECT draft_id FROM comments WHERE id = $1',
        [parentId]
      );
      if (parentCheck.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      if (parentCheck[0].draft_id !== draftId) {
        return res.status(400).json({ error: 'Parent belongs to a different draft' });
      }
    }

    try {
      const [newComment] = await db.query(
        `
          INSERT INTO comments (draft_id, user_id, text, parent_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [draftId, userId, text, parentId || null]
      );

      // Fetch user info for response
      const [user] = await db.query(
        'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      res.status(201).json({
        comment: {
          id: newComment.id,
          draftId: newComment.draft_id,
          userId: newComment.user_id,
          text: newComment.text,
          parentId: newComment.parent_id,
          createdAt: newComment.created_at,
          updatedAt: newComment.updated_at,
          relativeTime: timeAgo(newComment.created_at),
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar_url,
            initials: getInitials(user.name),
          },
          replies: [],
        },
      });
    } catch (err) {
      console.error('[POST /drafts/:id/comments]', err);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

// ── DELETE /comments/:id ──────────────────────────────────
// Delete a comment (author or admin only)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  try {
    const [existing] = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existing.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ success: true, deletedId: commentId });
  } catch (err) {
    console.error('[DELETE /comments/:id]', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ── Utility ─────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default router;
