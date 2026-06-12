import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createWebhookController } from '../controllers/WebhookController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createWebhookRoutes(container: Container): Router {
  const router = Router();
  const controller = createWebhookController(container);

  router.get('/config', requireAuth, controller.list as any);
  router.post('/config', requireAuth, requireRole('owner', 'admin') as any, controller.create as any);
  router.put('/config/:id', requireAuth, requireRole('owner', 'admin') as any, controller.update as any);
  router.delete('/config/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);
  router.post('/config/:id/test', requireAuth, requireRole('owner', 'admin') as any, controller.test as any);
  router.get('/config/:id/deliveries', requireAuth, requireRole('owner', 'admin') as any, controller.listDeliveries as any);
  router.get('/deliveries', requireAuth, requireRole('owner', 'admin') as any, controller.listAllDeliveries as any);

  return router;
}
