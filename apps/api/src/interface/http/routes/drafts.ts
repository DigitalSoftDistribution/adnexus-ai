import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createDraftController } from '../controllers/DraftController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createDraftRoutes(container: Container): Router {
  const router = Router();
  const controller = createDraftController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/stats', requireAuth, controller.stats as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.post('/:id/approve', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.approve as any);
  router.post('/:id/reject', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.reject as any);
  router.post('/:id/execute', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.execute as any);
  router.get('/:id/comments', requireAuth, controller.listComments as any);
  router.post('/:id/comments', requireAuth, controller.addComment as any);
  router.delete('/:id/comments/:commentId', requireAuth, requireRole('owner', 'admin') as any, controller.deleteComment as any);

  return router;
}
