import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAdController } from '../controllers/AdController';
import { requireAuth } from '../middleware/requireAuth';

export function createAdRoutes(container: Container): Router {
  const router = Router();
  const controller = createAdController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.get('/:id/performance', requireAuth, controller.performance as any);
  router.get('/:id/creative-performance', requireAuth, controller.creativePerformance as any);

  return router;
}
