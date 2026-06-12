import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAdController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAds.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        campaignId: req.query.campaignId as string | undefined,
        adsetId: req.query.adsetId as string | undefined,
        platform: req.query.platform as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAdById.execute({
        adId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    performance: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAdPerformance.execute({
        adId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    creativePerformance: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAdCreativePerformance.execute({
        adId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateAd.execute({
        adId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),


    bulkValidate: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.bulkValidateAds.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        specs: req.body?.specs ?? req.body,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    duplicate: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.duplicateAd.execute({
        adId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
