import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createExportController } from '../controllers/ExportController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createExportRoutes(container: Container): Router {
  const router = Router();
  const controller = createExportController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/:id/download', requireAuth, controller.download as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);

  return router;
}
