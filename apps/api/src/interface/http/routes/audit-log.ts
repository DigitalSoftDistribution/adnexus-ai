import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAuditLogController } from '../controllers/AuditLogController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAuditLogRoutes(container: Container): Router {
  const router = Router();
  const controller = createAuditLogController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/export', requireAuth, requireRole('owner', 'admin') as any, controller.export as any);
  router.get('/summary', requireAuth, controller.summary as any);
  router.get('/:id', requireAuth, controller.getById as any);

  return router;
}
