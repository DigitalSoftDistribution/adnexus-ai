import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createWebhookController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listWebhookConfigs.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createWebhookConfig.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        name: req.body.name,
        url: req.body.url,
        events: req.body.events,
        secret: req.body.secret,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateWebhookConfig.execute({
        webhookId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        name: req.body.name,
        url: req.body.url,
        events: req.body.events,
        secret: req.body.secret,
        status: req.body.status,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteWebhookConfig.execute({
        webhookId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    test: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.testWebhookConfig.execute({
        webhookId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        eventType: req.body?.eventType,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    listDeliveries: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listWebhookDeliveries.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        webhookId: req.params.id,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    listAllDeliveries: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listWebhookDeliveries.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        webhookId: typeof req.query.webhookId === 'string' ? req.query.webhookId : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
