import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAssetController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAssets.execute({
        workspaceId: req.user!.workspaceId,
        type: req.query.type as string | string[] | undefined,
        status: req.query.status as string | string[] | undefined,
        campaignId: req.query.campaignId as string | undefined,
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
      const result = await container.getAssetById.execute({
        assetId: req.params.id,
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createAsset.execute({
        workspaceId: req.user!.workspaceId,
        name: req.body.name,
        originalName: req.body.originalName,
        type: req.body.type,
        mimeType: req.body.mimeType,
        size: req.body.size,
        url: req.body.url,
        thumbnailUrl: req.body.thumbnailUrl,
        metadata: req.body.metadata,
        campaignId: req.body.campaignId,
        adId: req.body.adId,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateAsset.execute({
        assetId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteAsset.execute({
        assetId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),
  };
}
