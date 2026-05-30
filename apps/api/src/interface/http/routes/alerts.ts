import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAlertController } from '../controllers/AlertController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAlertRoutes(container: Container): Router {
  const router = Router();
  const controller = createAlertController(container);

  router.get('/', requireAuth, controller.list as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);
  router.post('/:id/toggle', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.toggle as any);
  router.get('/:id/history', requireAuth, controller.history as any);

  return router;
}
