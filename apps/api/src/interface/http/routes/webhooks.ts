import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createWebhookController } from '../controllers/WebhookController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createWebhookRoutes(container: Container): Router {
  const router = Router();
  const controller = createWebhookController(container);

  router.get('/config', requireAuth, controller.list as any);
  router.post('/config', requireAuth, requireRole('owner', 'admin') as any, controller.create as any);

  return router;
}
