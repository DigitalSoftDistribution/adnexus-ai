import { Router } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import {
  createCheckoutSession,
  createPortalSession,
  createStripeCustomer,
  handleWebhookEvent,
  retrieveInvoices,
  stripe,
  getConfiguredPlans,
  getPlanForPrice,
  isBillingCheckoutConfigured,
  isStripeSecretConfigured,
} from "../services/stripe";
import { db } from "../db";
import { workspaces, workspaceCredits, auditLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import logger from "../utils/logger";

const router = Router();

// ─── GET /billing — current plan, usage, credits ───
router.get("/", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;

    // Fetch workspace with billing info
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new HttpError(404, "Workspace not found");
    }

    // Fetch credit usage
    const creditRow = await db.query.workspaceCredits.findFirst({
      where: eq(workspaceCredits.workspaceId, workspaceId),
    });

    const planLimits: Record<string, { creatives: number; impressions: number; aiCredits: number }> = {
      free: { creatives: 5, impressions: 1000, aiCredits: 50 },
      starter: { creatives: 50, impressions: 50000, aiCredits: 500 },
      growth: { creatives: 200, impressions: 500000, aiCredits: 5000 },
      pro: { creatives: 1000, impressions: 2000000, aiCredits: 25000 },
      enterprise: { creatives: -1, impressions: -1, aiCredits: -1 },
    };

    const currentPlan = workspace.plan || "free";
    const limits = planLimits[currentPlan] || planLimits.free;

    res.json({
      workspaceId: workspace.id,
      name: workspace.name,
      plan: currentPlan,
      status: workspace.subscriptionStatus || "inactive",
      stripeCustomerId: workspace.stripeCustomerId || null,
      stripeSubscriptionId: workspace.stripeSubscriptionId || null,
      currentPeriodStart: workspace.currentPeriodStart || null,
      currentPeriodEnd: workspace.currentPeriodEnd || null,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd || false,
      credits: {
        creativesUsed: creditRow?.creativesUsed || 0,
        creativesTotal: limits.creatives,
        impressionsUsed: creditRow?.impressionsUsed || 0,
        impressionsTotal: limits.impressions,
        aiCreditsUsed: creditRow?.aiCreditsUsed || 0,
        aiCreditsTotal: limits.aiCredits,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /billing/plans — configured launch-safe paid plans ───
router.get("/plans", requireAuth, requireWorkspace, async (_req, res, next) => {
  try {
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
          : "Billing checkout is not configured. Set Stripe secret and price mapping environment variables before enabling upgrades.",
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /billing/checkout — create Stripe Checkout session ───
router.post("/checkout", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;
    const userId = req.user!.sub;
    const { priceId, successUrl, cancelUrl } = req.body as { priceId?: string; successUrl?: string; cancelUrl?: string };

    if (!priceId) {
      throw new HttpError(400, "Price ID is required");
    }

    if (!isBillingCheckoutConfigured()) {
      throw new HttpError(503, "Billing checkout is not configured");
    }

    if (!getPlanForPrice(priceId)) {
      throw new HttpError(400, "Unknown Stripe price ID");
    }

    // Fetch workspace
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new HttpError(404, "Workspace not found");
    }

    // Ensure Stripe customer exists
    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer({
        email: req.user!.email,
        name: req.user!.email,
        workspaceId: workspace.id,
        userId: userId,
      });

      await db
        .update(workspaces)
        .set({ stripeCustomerId: customerId })
        .where(eq(workspaces.id, workspaceId));
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      workspaceId: workspace.id,
      userId: userId,
      successUrl: successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/billing?canceled=true`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    next(err);
  }
});

// ─── POST /billing/portal — create Stripe Customer Portal session ───
router.post("/portal", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;
    const { returnUrl } = req.body as { returnUrl?: string };

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace?.stripeCustomerId) {
      throw new HttpError(400, "No Stripe customer found for this workspace");
    }

    const portalSession = await createPortalSession({
      customerId: workspace.stripeCustomerId,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    next(err);
  }
});

// ─── POST /billing/webhook — handle Stripe webhooks ───
// NOTE: This endpoint must NOT require auth — Stripe sends it directly
router.post("/webhook", async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      throw new HttpError(400, "Missing stripe-signature header");
    }

    if (!endpointSecret) {
      logger.warn("Stripe webhook secret not configured");
      throw new HttpError(500, "Webhook secret not configured");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: msg }, "Stripe webhook signature verification failed");
      throw new HttpError(400, `Webhook signature verification failed: ${msg}`);
    }

    logger.info({ eventType: event.type, eventId: event.id }, "Stripe webhook received");

    // Handle the event
    await handleWebhookEvent(event);

    // Log the webhook for audit trail
    try {
      const eventObject = event.data?.object as unknown as Record<string, unknown> | undefined;
      const workspaceId = (eventObject?.client_reference_id as string)
        || (eventObject?.metadata as Record<string, string> | undefined)?.workspace_id
        || null;

      await db.insert(auditLogs).values({
        workspaceId: workspaceId || "system",
        userId: "stripe-webhook",
        action: "stripe.webhook",
        entityType: "subscription",
        entityId: event.id,
        metadata: {
          eventType: event.type,
          objectId: eventObject?.id,
        } as Record<string, unknown>,
        created_at: new Date(),
      });
    } catch (logErr) {
      logger.error({ error: logErr }, "Failed to log webhook event");
    }

    res.json({ received: true, eventId: event.id });
  } catch (err) {
    next(err);
  }
});

// ─── GET /billing/invoices — list invoices ───
router.get("/invoices", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace?.stripeCustomerId) {
      return res.json({ invoices: [], hasMore: false });
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const startingAfter = (req.query.startingAfter as string) || undefined;

    const result = await retrieveInvoices({
      customerId: workspace.stripeCustomerId,
      limit,
      startingAfter,
    });

    res.json({
      invoices: result.invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
        subscriptionId: inv.subscription,
        description: inv.description,
        paid: inv.status === "paid",
      })),
      hasMore: result.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
