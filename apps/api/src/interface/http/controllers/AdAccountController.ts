import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAdAccountController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAdAccounts.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.query.platform as any,
        status: req.query.status as any,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    connect: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.connectAdAccount.execute({
        workspaceId: req.user!.workspaceId,
        platform: req.body.platform,
        platformAccountId: req.body.platformAccountId,
        name: req.body.name,
        tokenExpiresAt: req.body.tokenExpiresAt ? new Date(req.body.tokenExpiresAt) : undefined,
        spendCap: req.body.spendCap,
        metadata: req.body.metadata,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    sync: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.syncAdAccount.execute({
        adAccountId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    disconnect: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.disconnectAdAccount.execute({
        adAccountId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        reason: req.body.reason,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),
  };
}
