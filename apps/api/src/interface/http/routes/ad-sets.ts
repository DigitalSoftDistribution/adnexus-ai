import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAdSetController } from '../controllers/AdSetController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAdSetRoutes(container: Container): Router {
  const router = Router({ mergeParams: true });
  const controller = createAdSetController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);

  return router;
}
