import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createOnboardingController } from '../controllers/OnboardingController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createOnboardingRoutes(container: Container): Router {
  const router = Router();
  const controller = createOnboardingController(container);

  router.get('/', requireAuth, controller.status as any);
  router.post('/step', requireAuth, requireRole('owner', 'admin') as any, controller.setStep as any);
  router.post('/complete', requireAuth, requireRole('owner', 'admin') as any, controller.complete as any);

  return router;
}
