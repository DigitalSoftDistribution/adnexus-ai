import type { Container } from '../../../application/services/Container';
import { REPORT_TEMPLATES } from '../../../domain/reports/reportTemplates';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createReportController(container: Container) {
  return {
    templates: asyncHandler<AuthenticatedRequest>(async (_req, res) => {
      res.json({ success: true, data: REPORT_TEMPLATES });
    }),

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

    results: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getReportResults.execute({
        reportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    listScheduled: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.listScheduledReports) {
        res.status(503).json({
          success: false,
          error: { code: 'SCHEDULED_REPORTS_UNAVAILABLE', message: 'Scheduled reports are not configured' },
        });
        return;
      }
      const result = await container.listScheduledReports.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    createScheduled: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.createScheduledReport) {
        res.status(503).json({
          success: false,
          error: { code: 'SCHEDULED_REPORTS_UNAVAILABLE', message: 'Scheduled reports are not configured' },
        });
        return;
      }
      const result = await container.createScheduledReport.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        name: req.body.name,
        description: req.body.description,
        reportType: req.body.reportType,
        config: req.body.config,
        scheduleCron: req.body.scheduleCron,
        recipients: req.body.recipients,
        format: req.body.format,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    deleteScheduled: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      if (!container.deleteScheduledReport) {
        res.status(503).json({
          success: false,
          error: { code: 'SCHEDULED_REPORTS_UNAVAILABLE', message: 'Scheduled reports are not configured' },
        });
        return;
      }
      const result = await container.deleteScheduledReport.execute({
        scheduledReportId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.status(204).send();
    }),
  };
}
