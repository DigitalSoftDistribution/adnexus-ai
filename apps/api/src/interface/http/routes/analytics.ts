import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAnalyticsController } from '../controllers/AnalyticsController';
import { requireAuth } from '../middleware/requireAuth';

export function createAnalyticsRoutes(container: Container): Router {
  const router = Router();
  const controller = createAnalyticsController(container);

  router.get('/data', requireAuth, controller.data as any);

  return router;
}
