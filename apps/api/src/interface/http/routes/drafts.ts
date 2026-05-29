import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createDraftController } from '../controllers/DraftController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createDraftRoutes(container: Container): Router {
  const router = Router();
  const controller = createDraftController(container);

  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor'), controller.create);
  router.post('/:id/approve', requireAuth, requireRole('owner', 'admin', 'editor'), controller.approve);

  return router;
}
