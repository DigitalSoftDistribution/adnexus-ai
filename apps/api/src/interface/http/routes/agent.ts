import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAgentController } from '../controllers/AgentController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAgentRoutes(container: Container): Router {
  const router = Router();
  const controller = createAgentController(container);

  router.get('/status', requireAuth, controller.status as any);
  router.get('/rules', requireAuth, controller.listRules as any);
  router.get('/rules/:id', requireAuth, controller.getRuleById as any);
  router.post('/rules', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.createRule as any);
  router.put('/rules/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.updateRule as any);
  router.delete('/rules/:id', requireAuth, requireRole('owner', 'admin') as any, controller.deleteRule as any);
  router.post('/rules/:id/toggle', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.toggleRule as any);

  return router;
}
