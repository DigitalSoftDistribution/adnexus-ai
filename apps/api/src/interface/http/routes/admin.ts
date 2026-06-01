import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAdminController } from '../controllers/AdminController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAdminRoutes(container: Container): Router {
  const router = Router();
  const controller = createAdminController(container);

  router.get('/stats', requireAuth, requireRole('admin') as any, controller.getStats as any);
  router.get('/workspaces', requireAuth, requireRole('admin') as any, controller.listWorkspaces as any);
  router.get('/users', requireAuth, requireRole('admin') as any, controller.listUsers as any);
  router.post('/impersonate/:userId', requireAuth, requireRole('admin') as any, controller.impersonateUser as any);

  return router;
}
