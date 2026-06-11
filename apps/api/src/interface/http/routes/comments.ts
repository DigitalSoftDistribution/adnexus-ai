import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createCommentController } from '../controllers/CommentController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createCommentRoutes(container: Container): Router {
  const router = Router();
  const controller = createCommentController(container);

  router.get('/', requireAuth, controller.list as any);
  router.post('/', requireAuth, controller.create as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);

  return router;
}
