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

  // Advisory surface
  router.get('/recommendations', requireAuth, controller.recommendations as any);
  router.post('/recommendations/:id/apply', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.applyRecommendation as any);
  router.post('/recommendations/:id/dismiss', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.dismissRecommendation as any);
  router.get('/insights', requireAuth, controller.insights as any);
  router.get('/conversations', requireAuth, controller.listConversations as any);
  router.post('/conversations', requireAuth, controller.createConversation as any);
  router.get('/conversations/:id', requireAuth, controller.getConversation as any);
  router.post('/conversations/:id/messages', requireAuth, controller.sendMessage as any);

  return router;
}
