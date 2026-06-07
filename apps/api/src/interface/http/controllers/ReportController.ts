import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createReportController(container: Container) {
  return {
    dashboard: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignSummary.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listReports.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        type: req.query.type as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getReportById.execute({
        reportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createReport.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        name: req.body.name,
        type: req.body.type,
        config: req.body.config,
        schedule: req.body.schedule,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateReport.execute({
        reportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteReport.execute({
        reportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.status(204).send();
    }),

    run: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.runReport.execute({
        reportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
