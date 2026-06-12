import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/connection';
import { authenticate, requireMember as requireAuth } from '../middleware/authenticate';
import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('comments-route');

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
    const { rows } = await query(
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
      const id = row.id as string;
      const draftId = row.draft_id as string;
      const userId = row.user_id as string;
      const text = row.text as string;
      const parentId = row.parent_id as string | null;
      const createdAt = row.created_at as unknown as Date;
      const updatedAt = row.updated_at as unknown as Date;
      const userName = row.user_name as string;
      const userEmail = row.user_email as string;
      const userAvatar = row.user_avatar as string | undefined;

      const comment = {
        id,
        draftId,
        userId,
        text,
        parentId,
        createdAt,
        updatedAt,
        relativeTime: timeAgo(createdAt),
        user: {
          id: userId,
          name: userName,
          email: userEmail,
          avatar: userAvatar,
          initials: getInitials(userName),
        },
        replies: [] as any[],
      };

      if (parentId) {
        const parentIdStr = String(parentId);
        if (!replyMap[parentIdStr]) replyMap[parentIdStr] = [];
        replyMap[parentIdStr].push(comment);
      } else {
        comments.push(comment);
      }
    }

    // Attach replies to their parent comments (1-level nesting)
    for (const comment of comments) {
      const commentId = String(comment.id);
      if (replyMap[commentId]) {
        comment.replies = replyMap[commentId].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    }

    res.json({ draftId, comments });
  } catch (err) {
    logger.error({ err }, 'GET /drafts/:id/comments');
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
    const userId = req.user!.sub;

    const parse = createCommentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { text, parentId } = parse.data;

    try {
      // If replying, validate parent belongs to same draft
      if (parentId) {
        const { rows: parentCheck } = await query(
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

      const { rows: [newComment] } = await query(
        `
          INSERT INTO comments (draft_id, user_id, text, parent_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [draftId, userId, text, parentId || null]
      );

      const newId = newComment?.id as string;
      const newDraftId = newComment?.draft_id as string;
      const newUserId = newComment?.user_id as string;
      const newText = newComment?.text as string;
      const newParentId = newComment?.parent_id as string | null;
      const newCreatedAt = newComment?.created_at as unknown as Date;
      const newUpdatedAt = newComment?.updated_at as unknown as Date;

      // Fetch user info for response
      const { rows: [user] } = await query(
        'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const usr = user as Record<string, unknown> | undefined;

      res.status(201).json({
        comment: {
          id: newId,
          draftId: newDraftId,
          userId: newUserId,
          text: newText,
          parentId: newParentId,
          createdAt: newCreatedAt,
          updatedAt: newUpdatedAt,
          relativeTime: timeAgo(newCreatedAt),
          user: {
            id: usr?.id as string,
            name: usr?.name as string,
            email: usr?.email as string,
            avatar: usr?.avatar_url as string | undefined,
            initials: getInitials(usr?.name as string),
          },
          replies: [],
        },
      });
    } catch (err) {
      logger.error({ err }, 'POST /drafts/:id/comments');
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

// ── DELETE /comments/:id ──────────────────────────────────
// Delete a comment (author or admin only)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user!.sub;
  const isAdmin = req.user!.role === 'admin';

  try {
    const { rows: [existing] } = await query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existing.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ success: true, deletedId: commentId });
  } catch (err) {
    logger.error({ err }, 'DELETE /comments/:id');
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
