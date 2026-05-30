import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createCampaignController } from '../controllers/CampaignController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createCampaignRoutes(container: Container): Router {
  const router = Router();
  const controller = createCampaignController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/summary', requireAuth, controller.summary as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);
  router.post('/:id/pause', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.pause as any);
  router.post('/:id/activate', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.activate as any);
  router.post('/:id/duplicate', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.duplicate as any);

  return router;
}
