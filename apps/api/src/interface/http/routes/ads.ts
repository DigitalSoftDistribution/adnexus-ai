import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAdController } from '../controllers/AdController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAdRoutes(container: Container): Router {
  const router = Router();
  const controller = createAdController(container);

  router.post('/bulk/validate', requireAuth, requireRole('owner', 'admin') as any, controller.bulkValidate as any);
  router.get('/', requireAuth, controller.list as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.post('/:id/duplicate', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.duplicate as any);
  router.get('/:id/performance', requireAuth, controller.performance as any);
  router.get('/:id/creative-performance', requireAuth, controller.creativePerformance as any);

  return router;
}
