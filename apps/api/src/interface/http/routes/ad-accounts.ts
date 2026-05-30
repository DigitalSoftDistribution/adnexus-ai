import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAdAccountController } from '../controllers/AdAccountController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAdAccountRoutes(container: Container): Router {
  const router = Router();
  const controller = createAdAccountController(container);

  router.get('/', requireAuth, controller.list as any);
  router.post('/connect', requireAuth, requireRole('owner', 'admin') as any, controller.connect as any);
  router.post('/:id/sync', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.sync as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.disconnect as any);

  return router;
}
