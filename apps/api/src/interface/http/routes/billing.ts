import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createBillingController } from '../controllers/BillingController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createBillingRoutes(container: Container): Router {
  const router = Router();
  const controller = createBillingController(container);

  router.get('/', requireAuth, controller.getInfo as any);
  router.get('/plans', requireAuth, controller.getPlans as any);
  router.get('/invoices', requireAuth, controller.listInvoices as any);
  router.post('/checkout', requireAuth, requireRole('owner', 'admin') as any, controller.createCheckout as any);
  router.post('/portal', requireAuth, requireRole('owner', 'admin') as any, controller.createPortal as any);
  router.post('/cancel', requireAuth, requireRole('owner') as any, controller.cancel as any);

  return router;
}
