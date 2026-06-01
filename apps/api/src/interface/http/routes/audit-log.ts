import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAuditLogController } from '../controllers/AuditLogController';
import { requireAuth } from '../middleware/requireAuth';

export function createAuditLogRoutes(container: Container): Router {
  const router = Router();
  const controller = createAuditLogController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/summary', requireAuth, controller.summary as any);

  return router;
}
