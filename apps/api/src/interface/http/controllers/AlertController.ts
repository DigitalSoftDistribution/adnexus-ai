import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAlertController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAlerts.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        type: req.query.type as string | undefined,
        enabled: req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAlertById.execute({
        alertId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createAlert.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        name: req.body.name,
        type: req.body.type,
        metric: req.body.metric,
        operator: req.body.operator,
        threshold: req.body.threshold,
        channels: req.body.channels,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateAlert.execute({
        alertId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteAlert.execute({
        alertId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.status(204).send();
    }),

    toggle: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.toggleAlert.execute({
        alertId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        enabled: req.body.enabled,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    history: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAlertHistory.execute({
        alertId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
