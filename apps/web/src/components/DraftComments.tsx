import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── Types ───────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  initials: string;
}

interface Comment {
  id: string;
  draftId: string;
  userId: string;
  text: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  relativeTime: string;
  user: User;
  replies: Comment[];
}

interface MentionOption {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface DraftCommentsProps {
  draftId: string;
  currentUser: User;
  apiBaseUrl?: string;
}

// ── Helpers ─────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? 's' : ''} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? 's' : ''} ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function highlightMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+(?:\s\w+)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="dc-mention">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Avatar ──────────────────────────────────────────────────
const Avatar: React.FC<{ user: User; size?: number }> = ({ user, size = 36 }) => (
  <div
    className="dc-avatar"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
    title={user.name}
  >
    {user.avatar ? (
      <img src={user.avatar} alt={user.name} className="dc-avatar-img" />
    ) : (
      <span className="dc-avatar-initials">{user.initials}</span>
    )}
  </div>
);

// ── Mention Autocomplete ────────────────────────────────────
const MentionAutocomplete: React.FC<{
  query: string;
  onSelect: (user: MentionOption) => void;
  apiBaseUrl: string;
  draftId: string;
}> = ({ query, onSelect, apiBaseUrl, draftId }) => {
  const [users, setUsers] = useState<MentionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Search for users who have commented on this draft + current user
        const res = await fetch(
          `${apiBaseUrl}/drafts/${draftId}/commenters?search=${encodeURIComponent(query)}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        } else {
          // Fallback: empty list
          setUsers([]);
        }
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, apiBaseUrl, draftId]);

  if (!query) return null;

  return (
    <div className="dc-mention-dropdown">
      {loading && <div className="dc-mention-loading">Loading…</div>}
      {!loading && users.length === 0 && (
        <div className="dc-mention-empty">No users found</div>
      )}
      {users.map((u) => (
        <button
          key={u.id}
          className="dc-mention-option"
          onClick={() => onSelect(u)}
          type="button"
        >
          <div className="dc-mention-avatar">
            <span>{u.initials}</span>
          </div>
          <div className="dc-mention-info">
            <span className="dc-mention-name">{u.name}</span>
            <span className="dc-mention-email">{u.email}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Comment Input ───────────────────────────────────────────
const CommentInput: React.FC<{
  draftId: string;
  parentId?: string | null;
  currentUser: User;
  apiBaseUrl: string;
  onSubmit: (text: string, parentId?: string | null) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}> = ({
  draftId,
  parentId = null,
  currentUser,
  apiBaseUrl,
  onSubmit,
  onCancel,
  placeholder = 'Write a comment…',
  autoFocus = false,
}) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAtIndex = useRef<number>(-1);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [text]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);

      const cursorPos = e.target.selectionStart;
      const beforeCursor = val.slice(0, cursorPos);
      const atMatch = beforeCursor.match(/@([^\s@]*)$/);

      if (atMatch) {
        setMentionQuery(atMatch[1]);
        setShowMentions(true);
        lastAtIndex.current = beforeCursor.lastIndexOf('@');
      } else {
        setMentionQuery('');
        setShowMentions(false);
      }
    },
    []
  );

  const handleMentionSelect = useCallback(
    (user: MentionOption) => {
      if (lastAtIndex.current === -1) return;
      const before = text.slice(0, lastAtIndex.current);
      const after = text.slice(textareaRef.current?.selectionStart || 0);
      const newText = `${before}@${user.name} ${after}`;
      setText(newText);
      setShowMentions(false);
      setMentionQuery('');
      lastAtIndex.current = -1;
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [text]
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      onSubmit(trimmed, parentId);
      setText('');
    } finally {
      setSubmitting(false);
    }
  }, [text, parentId, submitting, onSubmit]);

  return (
    <div className="dc-input-wrapper">
      <div className="dc-input-header">
        <Avatar user={currentUser} size={32} />
        <div className="dc-input-name">{currentUser.name}</div>
      </div>
      <div className="dc-input-body">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="dc-textarea"
        />
        {showMentions && (
          <MentionAutocomplete
            query={mentionQuery}
            onSelect={handleMentionSelect}
            apiBaseUrl={apiBaseUrl}
            draftId={draftId}
          />
        )}
      </div>
      <div className="dc-input-actions">
        <span className="dc-hint">Cmd+Enter to submit</span>
        <div className="dc-input-buttons">
          {onCancel && (
            <button className="dc-btn-secondary" onClick={onCancel} type="button">
              Cancel
            </button>
          )}
          <button
            className="dc-btn-primary"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            type="button"
          >
            {submitting ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Comment Item ────────────────────────────────────────────
const CommentItem: React.FC<{
  comment: Comment;
  currentUser: User;
  apiBaseUrl: string;
  draftId: string;
  onReply: (text: string, parentId: string) => void;
  onDelete: (commentId: string) => void;
}> = ({ comment, currentUser, apiBaseUrl, draftId, onReply, onDelete }) => {
  const [replying, setReplying] = useState(false);
  const isAuthor = comment.userId === currentUser.id;
  const isAdmin = currentUser.email?.endsWith('@admin'); // or check role

  return (
    <div className="dc-comment">
      <div className="dc-comment-main">
        <div className="dc-comment-avatar">
          <Avatar user={comment.user} size={36} />
        </div>
        <div className="dc-comment-content">
          <div className="dc-comment-meta">
            <span className="dc-comment-author">{comment.user.name}</span>
            <span className="dc-comment-time" title={comment.createdAt}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <div className="dc-comment-text">
            {highlightMentions(comment.text)}
          </div>
          <div className="dc-comment-actions">
            <button
              className="dc-action-btn"
              onClick={() => setReplying((r) => !r)}
              type="button"
            >
              Reply
            </button>
            {(isAuthor || isAdmin) && (
              <button
                className="dc-action-btn dc-action-delete"
                onClick={() => onDelete(comment.id)}
                type="button"
              >
                Delete
              </button>
            )}
          </div>

          {replying && (
            <div className="dc-reply-input">
              <CommentInput
                draftId={draftId}
                parentId={comment.id}
                currentUser={currentUser}
                apiBaseUrl={apiBaseUrl}
                onSubmit={(text, pid) => {
                  onReply(text, pid || comment.id);
                  setReplying(false);
                }}
                onCancel={() => setReplying(false)}
                placeholder={`Reply to ${comment.user.name}…`}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies (1 level deep) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="dc-replies">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="dc-reply">
              <div className="dc-comment-avatar">
                <Avatar user={reply.user} size={28} />
              </div>
              <div className="dc-comment-content">
                <div className="dc-comment-meta">
                  <span className="dc-comment-author">{reply.user.name}</span>
                  <span className="dc-comment-time" title={reply.createdAt}>
                    {timeAgo(reply.createdAt)}
                  </span>
                </div>
                <div className="dc-comment-text">
                  {highlightMentions(reply.text)}
                </div>
                <div className="dc-comment-actions">
                  {(reply.userId === currentUser.id || isAdmin) && (
                    <button
                      className="dc-action-btn dc-action-delete"
                      onClick={() => onDelete(reply.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────
const DraftComments: React.FC<DraftCommentsProps> = ({
  draftId,
  currentUser,
  apiBaseUrl = '/api',
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/drafts/${draftId}/comments`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setComments(data.comments || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [draftId, apiBaseUrl]);

  // ── Handlers ──────────────────────────────────────────────
  const handleAddComment = useCallback(
    async (text: string, parentId?: string | null) => {
      try {
        const res = await fetch(`${apiBaseUrl}/drafts/${draftId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text, parentId: parentId || undefined }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setComments((prev) => {
          if (parentId) {
            return prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...c.replies, data.comment] }
                : c
            );
          }
          return [...prev, data.comment];
        });
      } catch (err) {
        console.error('Failed to add comment:', err);
        setError('Failed to post comment');
      }
    },
    [draftId, apiBaseUrl]
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!window.confirm('Delete this comment?')) return;
      try {
        const res = await fetch(`${apiBaseUrl}/comments/${commentId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies.filter((r) => r.id !== commentId),
            }))
        );
      } catch (err) {
        console.error('Failed to delete comment:', err);
        setError('Failed to delete comment');
      }
    },
    [apiBaseUrl]
  );

  const totalCount = useMemo(() => {
    return comments.reduce(
      (sum, c) => sum + 1 + (c.replies?.length || 0),
      0
    );
  }, [comments]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="draft-comments">
      <div className="dc-header">
        <h3 className="dc-title">Comments</h3>
        <span className="dc-count">{totalCount}</span>
      </div>

      {/* New top-level comment */}
      <div className="dc-composer">
        <CommentInput
          draftId={draftId}
          currentUser={currentUser}
          apiBaseUrl={apiBaseUrl}
          onSubmit={handleAddComment}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="dc-error">
          {error}
          <button className="dc-error-close" onClick={() => setError(null)} type="button">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="dc-loading">Loading comments…</div>}

      {/* Comment list */}
      {!loading && comments.length === 0 && (
        <div className="dc-empty">
          <p>No comments yet. Be the first to share your thoughts.</p>
        </div>
      )}

      <div className="dc-list">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUser={currentUser}
            apiBaseUrl={apiBaseUrl}
            draftId={draftId}
            onReply={handleAddComment}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

// ── Styles (CSS-in-JSX for portability) ─────────────────────
export const draftCommentsStyles = `
.draft-comments {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a2e;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}

.dc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.dc-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.dc-count {
  background: #6366f1;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
}

/* ── Composer ─────────────────────────────────────────────── */
.dc-composer {
  margin-bottom: 24px;
}

.dc-input-wrapper {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}

.dc-input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.dc-input-name {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.dc-input-body {
  position: relative;
}

.dc-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
  box-sizing: border-box;
}

.dc-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.dc-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.dc-hint {
  font-size: 12px;
  color: #94a3b8;
}

.dc-input-buttons {
  display: flex;
  gap: 8px;
}

.dc-btn-primary {
  background: #6366f1;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.dc-btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.dc-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dc-btn-secondary {
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.dc-btn-secondary:hover {
  background: #f1f5f9;
}

/* ── Avatar ───────────────────────────────────────────────── */
.dc-avatar {
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.dc-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dc-avatar-initials {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* ── Comment List ─────────────────────────────────────────── */
.dc-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dc-comment {
  display: flex;
  flex-direction: column;
}

.dc-comment-main {
  display: flex;
  gap: 12px;
}

.dc-comment-content {
  flex: 1;
  min-width: 0;
}

.dc-comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.dc-comment-author {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.dc-comment-time {
  font-size: 12px;
  color: #94a3b8;
}

.dc-comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.dc-mention {
  color: #6366f1;
  font-weight: 500;
  background: rgba(99, 102, 241, 0.08);
  padding: 1px 4px;
  border-radius: 4px;
}

.dc-comment-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.dc-action-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.dc-action-btn:hover {
  color: #6366f1;
}

.dc-action-delete:hover {
  color: #ef4444;
}

/* ── Replies ──────────────────────────────────────────────── */
.dc-replies {
  margin-left: 48px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

.dc-reply {
  display: flex;
  gap: 10px;
}

.dc-reply-input {
  margin-top: 12px;
}

/* ── Mention Dropdown ─────────────────────────────────────── */
.dc-mention-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  margin-bottom: 4px;
}

.dc-mention-loading,
.dc-mention-empty {
  padding: 12px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}

.dc-mention-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.1s;
}

.dc-mention-option:hover {
  background: #f1f5f9;
}

.dc-mention-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.dc-mention-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dc-mention-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.dc-mention-email {
  font-size: 11px;
  color: #94a3b8;
}

/* ── States ───────────────────────────────────────────────── */
.dc-loading {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
  font-size: 14px;
}

.dc-empty {
  text-align: center;
  padding: 40px 16px;
  color: #94a3b8;
  font-size: 14px;
}

.dc-empty p {
  margin: 0;
}

.dc-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.dc-error-close {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
`;

export default DraftComments;
