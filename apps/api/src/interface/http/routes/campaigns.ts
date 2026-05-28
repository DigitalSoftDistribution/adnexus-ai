import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createCampaignController } from '../controllers/CampaignController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createCampaignRoutes(container: Container): Router {
  const router = Router();
  const controller = createCampaignController(container);

  router.get('/', requireAuth, controller.list);
  router.get('/summary', requireAuth, controller.summary);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor'), controller.create);

  return router;
}
