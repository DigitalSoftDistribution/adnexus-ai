import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createNotificationController } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/requireAuth';

export function createNotificationRoutes(container: Container): Router {
  const router = Router();
  const controller = createNotificationController(container);

  router.get('/', requireAuth, controller.list as any);
  router.put('/:id/read', requireAuth, controller.markRead as any);
  router.put('/read-all', requireAuth, controller.markAllRead as any);

  return router;
}
