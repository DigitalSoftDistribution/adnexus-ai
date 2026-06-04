import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createIntegrationController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listIntegrations.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    get: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getIntegration.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.params.platform,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    disconnect: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.disconnectIntegration.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.params.platform,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    health: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getIntegrationHealth.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.params.platform,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
