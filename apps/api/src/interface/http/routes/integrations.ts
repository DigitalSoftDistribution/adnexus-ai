import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createIntegrationController } from '../controllers/IntegrationController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createIntegrationRoutes(container: Container): Router {
  const router = Router();
  const controller = createIntegrationController(container);

  router.get('/', requireAuth, controller.list as any);
  // Preview/dev-only QA harness: seeds fake Meta/Google accounts, campaigns, and metrics.
  // Must be registered before /:platform param routes.
  router.post(
    '/mock-traffic/seed',
    requireAuth,
    requireRole('owner', 'admin') as any,
    controller.seedMockTraffic as any,
  );
  // Flat account list for dashboard/QA — must precede /:platform param routes.
  router.get('/accounts', requireAuth, controller.listAllAccounts as any);
  router.post(
    '/:platform/connect',
    requireAuth,
    requireRole('owner', 'admin') as any,
    controller.connect as any,
  );
  router.get('/:platform/accounts', requireAuth, controller.listAccounts as any);
  router.post(
    '/:platform/accounts/:accountId/select',
    requireAuth,
    requireRole('owner', 'admin') as any,
    controller.selectAccount as any,
  );
  router.get('/:platform/health', requireAuth, controller.health as any);
  router.get('/:platform', requireAuth, controller.get as any);
  router.post(
    '/:platform/disconnect',
    requireAuth,
    requireRole('owner', 'admin') as any,
    controller.disconnect as any,
  );
  // Account-level live sync: imports campaigns + metrics for one ad account.
  router.post(
    '/accounts/:accountId/sync',
    requireAuth,
    requireRole('owner', 'admin', 'editor') as any,
    controller.sync as any,
  );
  // Sync-job history for an ad account.
  router.get('/accounts/:accountId/sync-jobs', requireAuth, controller.syncJobs as any);

  return router;
}
