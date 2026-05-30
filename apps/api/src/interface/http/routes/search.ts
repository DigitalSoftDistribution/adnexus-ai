import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createSearchController } from '../controllers/SearchController';
import { requireAuth } from '../middleware/requireAuth';

export function createSearchRoutes(container: Container): Router {
  const router = Router();
  const controller = createSearchController(container);

  router.get('/', requireAuth, controller.search as any);
  router.get('/suggestions', requireAuth, controller.suggestions as any);

  return router;
}
