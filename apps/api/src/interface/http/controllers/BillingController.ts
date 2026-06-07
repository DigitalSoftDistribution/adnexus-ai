import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';
import { getConfiguredPlans, isBillingCheckoutConfigured, isStripeSecretConfigured } from '../../../services/stripe';

export function createBillingController(container: Container) {
  return {
    getInfo: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getBillingInfo.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getPlans: asyncHandler<AuthenticatedRequest>(async (_req, res) => {
      res.json({
        success: true,
        data: {
          billingEnabled: isBillingCheckoutConfigured(),
          stripeConfigured: isStripeSecretConfigured(),
          plans: getConfiguredPlans().map(({ plan, priceId, limits }) => ({
            plan,
            priceId,
            credits: limits,
          })),
          message: isBillingCheckoutConfigured()
            ? null
            : 'Billing checkout is not configured. Set Stripe secret and price mapping environment variables before enabling upgrades.',
        },
      });
    }),

    createCheckout: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createCheckoutSession.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        priceId: req.body.priceId,
        successUrl: req.body.successUrl,
        cancelUrl: req.body.cancelUrl,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    createPortal: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createPortalSession.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        returnUrl: req.body.returnUrl,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    listInvoices: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listInvoices.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        startingAfter: req.query.startingAfter as string | undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    cancel: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.cancelSubscription.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),
  };
}
