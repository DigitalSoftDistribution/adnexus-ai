import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAudienceController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAudiences.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.query.platform as string | undefined,
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAudienceById.execute({
        audienceId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createAudience.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        platform: req.body.platform,
        name: req.body.name,
        type: req.body.type,
        size: req.body.size,
        targeting: req.body.targeting,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateAudience.execute({
        audienceId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteAudience.execute({
        audienceId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.status(204).send();
    }),

    insights: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAudienceInsights.execute({
        audienceId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
