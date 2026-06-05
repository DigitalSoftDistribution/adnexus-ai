import { describe, it, expect, vi } from 'vitest';
import { ListNotificationsUseCase } from './ListNotificationsUseCase';
import { MarkNotificationReadUseCase } from './MarkNotificationReadUseCase';
import { MarkAllNotificationsReadUseCase } from './MarkAllNotificationsReadUseCase';
import type { INotificationRepository, Notification } from '../../../domain/repositories/INotificationRepository';

const notification: Notification = {
  id: 'n-1',
  workspaceId: 'ws-1',
  userId: 'u-1',
  type: 'budget_alert',
  title: 'Budget exceeded',
  message: 'Campaign X is over budget',
  priority: 'high',
  read: false,
  metadata: null,
  createdAt: new Date(),
};

const makeRepo = (overrides: Partial<INotificationRepository> = {}): INotificationRepository =>
  ({
    list: vi.fn().mockResolvedValue({ notifications: [notification], total: 1, unreadCount: 1, page: 1, limit: 20 }),
    findById: vi.fn().mockResolvedValue(notification),
    markAsRead: vi.fn().mockResolvedValue(true),
    markAllAsRead: vi.fn().mockResolvedValue(3),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as INotificationRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListNotificationsUseCase', () => {
  const base = { workspaceId: 'ws-1', userId: 'u-1', userRole: 'viewer' };

  it('lists notifications for a viewer', async () => {
    const res = await new ListNotificationsUseCase(makeRepo()).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.unreadCount).toBe(1);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListNotificationsUseCase(makeRepo()).execute({ ...base, userRole: 'nope' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('forwards unreadOnly + user scope to the repo', async () => {
    const repo = makeRepo();
    await new ListNotificationsUseCase(repo).execute({ ...base, unreadOnly: true, limit: 5 });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', userId: 'u-1', unreadOnly: true, limit: 5 }),
    );
  });
});

describe('MarkNotificationReadUseCase', () => {
  const base = { notificationId: 'n-1', workspaceId: 'ws-1', userId: 'u-1', userRole: 'viewer' };

  it('marks the user\'s own notification as read', async () => {
    const repo = makeRepo();
    const res = await new MarkNotificationReadUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.markAsRead).toHaveBeenCalledWith('n-1');
  });

  it('returns ok(false) when the notification does not exist', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const res = await new MarkNotificationReadUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe(false);
    expect(repo.markAsRead).not.toHaveBeenCalled();
  });

  it('403s when marking another user\'s notification', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...notification, userId: 'other' }) });
    const res = await new MarkNotificationReadUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.markAsRead).not.toHaveBeenCalled();
  });

  it('403s when the notification belongs to another workspace', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...notification, workspaceId: 'other-ws' }) });
    const res = await new MarkNotificationReadUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});

describe('MarkAllNotificationsReadUseCase', () => {
  const base = { workspaceId: 'ws-1', userId: 'u-1', userRole: 'viewer' };

  it('marks all as read and returns the count', async () => {
    const repo = makeRepo();
    const res = await new MarkAllNotificationsReadUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe(3);
    expect(repo.markAllAsRead).toHaveBeenCalledWith('ws-1', 'u-1');
  });

  it('denies an unknown role (403)', async () => {
    const res = await new MarkAllNotificationsReadUseCase(makeRepo()).execute({ ...base, userRole: 'nope' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});
