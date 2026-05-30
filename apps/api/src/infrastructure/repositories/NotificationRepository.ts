import type { INotificationRepository, Notification, NotificationFilters, NotificationListResult } from '../../domain/repositories/INotificationRepository';
import { query } from '../database/connection';

export class NotificationRepository implements INotificationRepository {
  async list(filters: NotificationFilters): Promise<NotificationListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['workspace_id = $1 AND user_id = $2'];
    const params: unknown[] = [filters.workspaceId, filters.userId];
    let idx = 2;

    if (filters.unreadOnly) {
      conditions.push(`read = false`);
    }

    const where = conditions.join(' AND ');

    const { rows } = await query<Notification>(
      `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ total: string; unread: string }>(
      `SELECT COUNT(*)::text as total, COUNT(*) FILTER (WHERE read = false)::text as unread FROM notifications WHERE workspace_id = $1 AND user_id = $2`,
      [filters.workspaceId, filters.userId],
    );

    return {
      notifications: rows,
      total: parseInt(countRows[0]?.total ?? '0', 10),
      unreadCount: parseInt(countRows[0]?.unread ?? '0', 10),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Notification | null> {
    const { rows } = await query<Notification>(
      `SELECT * FROM notifications WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async markAsRead(id: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE notifications SET read = true WHERE id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async markAllAsRead(workspaceId: string, userId: string): Promise<number> {
    const { rowCount } = await query(
      `UPDATE notifications SET read = true WHERE workspace_id = $1 AND user_id = $2 AND read = false`,
      [workspaceId, userId],
    );
    return rowCount ?? 0;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
