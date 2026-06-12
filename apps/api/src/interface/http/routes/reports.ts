import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createReportController } from '../controllers/ReportController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createReportRoutes(container: Container): Router {
  const router = Router();
  const controller = createReportController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/dashboard', requireAuth, controller.dashboard as any);
  router.get('/scheduled', requireAuth, controller.listScheduled as any);
  router.post('/scheduled', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.createScheduled as any);
  router.delete('/scheduled/:id', requireAuth, requireRole('owner', 'admin') as any, controller.deleteScheduled as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.get('/:id/results', requireAuth, controller.results as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);
  router.post('/:id/run', requireAuth, controller.run as any);

  return router;
}
