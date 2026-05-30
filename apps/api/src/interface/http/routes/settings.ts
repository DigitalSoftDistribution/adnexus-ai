import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createSettingsController } from '../controllers/SettingsController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createSettingsRoutes(container: Container): Router {
  const router = Router();
  const controller = createSettingsController(container);

  // Workspace
  router.get('/workspace', requireAuth, controller.getWorkspace as any);
  router.put('/workspace', requireAuth, requireRole('owner', 'admin') as any, controller.updateWorkspace as any);

  // Team
  router.get('/team', requireAuth, controller.getTeam as any);
  router.put('/team/:id', requireAuth, requireRole('owner', 'admin') as any, controller.updateTeamMember as any);
  router.delete('/team/:id', requireAuth, requireRole('owner', 'admin') as any, controller.removeTeamMember as any);

  // Integrations
  router.get('/integrations', requireAuth, controller.getIntegrations as any);

  // Notifications
  router.get('/notifications', requireAuth, controller.getNotifications as any);
  router.put('/notifications', requireAuth, controller.updateNotifications as any);

  // API Keys
  router.get('/api-keys', requireAuth, requireRole('owner', 'admin') as any, controller.getApiKeys as any);
  router.post('/api-keys', requireAuth, requireRole('owner', 'admin') as any, controller.createApiKey as any);
  router.delete('/api-keys/:id', requireAuth, requireRole('owner', 'admin') as any, controller.revokeApiKey as any);

  return router;
}
