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

    sync: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.syncAccount) {
        res.status(503).json({
          success: false,
          error: { code: 'SYNC_UNAVAILABLE', message: 'Account sync is not configured' },
        });
        return;
      }
      const result = await container.syncAccount.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        adAccountId: req.params.accountId,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    syncJobs: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.listSyncJobs) {
        res.status(503).json({
          success: false,
          error: { code: 'SYNC_UNAVAILABLE', message: 'Sync history is not configured' },
        });
        return;
      }
      const parsedLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined;
      const limit = parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined;
      const result = await container.listSyncJobs.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        adAccountId: req.params.accountId,
        limit,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    seedMockTraffic: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.seedMockTraffic) {
        res.status(503).json({
          success: false,
          error: { code: 'MOCK_TRAFFIC_UNAVAILABLE', message: 'Mock traffic harness is not configured' },
        });
        return;
      }

      const body = (req.body ?? {}) as {
        platforms?: string[];
        variant?: string;
        harnessKey?: string;
      };
      const result = await container.seedMockTraffic.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        platforms: body.platforms,
        variant: body.variant,
        harnessKey: body.harnessKey ?? (req.headers['x-mock-traffic-key'] as string | undefined),
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
