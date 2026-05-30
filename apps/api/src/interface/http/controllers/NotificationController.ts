import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createNotificationController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listNotifications.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        unreadOnly: req.query.unread === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    markRead: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.markNotificationRead.execute({
        notificationId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    markAllRead: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.markAllNotificationsRead.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
