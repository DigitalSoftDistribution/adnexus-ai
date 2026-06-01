import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAdminController(container: Container) {
  return {
    getStats: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAdminStats.execute({
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    listWorkspaces: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAllWorkspaces.execute({
        userRole: req.user!.role,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    listUsers: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAllUsers.execute({
        userRole: req.user!.role,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string | undefined,
        workspaceId: req.query.workspaceId as string | undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    impersonateUser: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.impersonateUser.execute({
        userRole: req.user!.role,
        targetUserId: req.params.userId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
