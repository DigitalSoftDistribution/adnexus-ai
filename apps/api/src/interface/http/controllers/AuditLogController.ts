import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAuditLogController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAuditLog.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.query.userId as string | undefined,
        actionCategory: req.query.actionCategory as string | string[] | undefined,
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
        campaignId: req.query.campaignId as string | undefined,
        platform: req.query.platform as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    summary: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAuditLogSummary.execute({
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
