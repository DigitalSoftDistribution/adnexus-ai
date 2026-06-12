import { Router } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import {
  createCheckoutSession,
  createPortalSession,
  createStripeCustomer,
  handleWebhookEvent,
  isBillingEnabled,
  retrieveInvoices,
  stripe,
  getConfiguredPlans,
  isBillingCheckoutConfigured,
  isStripeSecretConfigured,
} from "../services/stripe";
import { db } from "../db";
import { query } from "../db/connection";
import { workspaces, workspaceCredits, auditLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import logger from "../utils/logger";
import {
  checkoutRequestSchema,
  portalRequestSchema,
  getPlanLimits,
} from "@adnexus/shared";
import type {
  BillingOverview,
  CheckoutResponse,
  InvoicesResponse,
  PortalResponse,
  SubscriptionInfo,
  WebhookResponse,
} from "@adnexus/shared";

const router = Router();

// ─── Stripe configuration guard middleware ───
function requireStripeConfig(_req: unknown, _res: unknown, next: () => void) {
  if (!isBillingEnabled()) {
    throw new HttpError(
      503,
      "Stripe billing is not configured. Please set STRIPE_SECRET_KEY environment variable.",
    );
  }
  next();
}

// ─── GET /billing — current plan, usage, credits ───
router.get("/", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new HttpError(404, "Workspace not found");
    }

    const creditRow = await db.query.workspaceCredits.findFirst({
      where: eq(workspaceCredits.workspaceId, workspaceId),
    });

    const currentPlan = (workspace.plan || "FREE") as string;
    const limits = getPlanLimits(currentPlan as Parameters<typeof getPlanLimits>[0]);

    const body: BillingOverview = {
      workspaceId: workspace.id,
      name: workspace.name,
      plan: currentPlan as BillingOverview["plan"],
      status: (workspace.subscriptionStatus || "INACTIVE") as BillingOverview["status"],
      stripeCustomerId: workspace.stripeCustomerId || null,
      stripeSubscriptionId: workspace.stripeSubscriptionId || null,
      currentPeriodStart: workspace.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: workspace.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd || false,
      credits: {
        creativesUsed: creditRow?.creativesUsed || 0,
        creativesTotal: limits.creatives,
        impressionsUsed: creditRow?.impressionsUsed || 0,
        impressionsTotal: limits.impressions,
        aiCreditsUsed: creditRow?.aiCreditsUsed || 0,
        aiCreditsTotal: limits.aiCredits,
      },
    };

    res.json(body);
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

// ─── GET /billing/subscription — dedicated subscription status endpoint ───
router.get("/subscription", requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new HttpError(404, "Workspace not found");
    }

    let hasPaymentMethod: boolean | null = null;

    if (workspace.stripeCustomerId && isBillingEnabled()) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: workspace.stripeCustomerId,
          type: "card",
          limit: 1,
        });
        hasPaymentMethod = paymentMethods.data.length > 0;
      } catch (stripeErr) {
        logger.warn(
          { error: stripeErr, workspaceId },
          "Failed to check payment methods from Stripe",
        );
      }
    }

    const subscriptionInfo: SubscriptionInfo = {
      workspaceId: workspace.id,
      name: workspace.name,
      plan: (workspace.plan || "FREE") as SubscriptionInfo["plan"],
      status: (workspace.subscriptionStatus || "INACTIVE") as SubscriptionInfo["status"],
      stripeCustomerId: workspace.stripeCustomerId || null,
      stripeSubscriptionId: workspace.stripeSubscriptionId || null,
      currentPeriodStart: workspace.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: workspace.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd || false,
      trialEnd: null,
      hasPaymentMethod,
    };

    res.json(subscriptionInfo);
  } catch (err) {
    next(err);
  }
});

// ─── POST /billing/checkout — create Stripe Checkout session ───
router.post(
  "/checkout",
  requireAuth,
  requireWorkspace,
  requireStripeConfig,
  async (req, res, next) => {
    try {
      const workspaceId = req.workspace!.id;
      const userId = req.user!.sub;

      const parsed = checkoutRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(
          400,
          `Validation failed: ${parsed.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        );
      }

      const { priceId, successUrl, cancelUrl } = parsed.data;

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
          userId,
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
        userId,
        successUrl:
          successUrl || `${process.env.FRONTEND_URL}/billing?success=true`,
        cancelUrl:
          cancelUrl || `${process.env.FRONTEND_URL}/billing?canceled=true`,
      });

      const body: CheckoutResponse = {
        sessionId: session.id,
        url: session.url,
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /billing/portal — create Stripe Customer Portal session ───
router.post(
  "/portal",
  requireAuth,
  requireWorkspace,
  requireStripeConfig,
  async (req, res, next) => {
    try {
      const workspaceId = req.workspace!.id;

      const parsed = portalRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(
          400,
          `Validation failed: ${parsed.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
        );
      }

      const { returnUrl, flow } = parsed.data;

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace?.stripeCustomerId) {
        throw new HttpError(
          400,
          "No Stripe customer found for this workspace. Please subscribe to a plan first.",
        );
      }

      const portalSession = await createPortalSession({
        customerId: workspace.stripeCustomerId,
        returnUrl: returnUrl || `${process.env.FRONTEND_URL}/billing`,
        flow: flow || "payment_method_update",
      });

      const body: PortalResponse = {
        url: portalSession.url,
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /billing/webhook — handle Stripe webhooks ───
// NOTE: This endpoint must NOT require auth — Stripe sends it directly.
// In production, verify the Stripe-Signature header using your webhook secret.
router.post("/webhook", async (req, res, next) => {
  try {
    if (!isBillingEnabled()) {
      logger.warn("Stripe webhook received but billing is not configured");
      throw new HttpError(503, "Stripe billing is not configured");
    }

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
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { error: msg },
        "Stripe webhook signature verification failed",
      );
      throw new HttpError(
        400,
        `Webhook signature verification failed: ${msg}`,
      );
    }

    logger.info(
      { eventType: event.type, eventId: event.id },
      "Stripe webhook received",
    );

    // ── Idempotency ──────────────────────────────────────────
    // Stripe delivers at-least-once and retries on non-2xx. The unique row is
    // an atomic lock: concurrent deliveries of the same event can't both enter
    // the handler. The conflict path only re-claims a row that was started but
    // never finished (processed_at IS NULL) AND is older than the stale window,
    // so a crashed attempt is eventually retried without races re-processing a
    // freshly-claimed (in-flight) or already-completed event.
    const { rows: claim } = await query<{ id: string }>(
      `INSERT INTO stripe_webhook_events (id, type)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE
           SET received_at = NOW()
           WHERE stripe_webhook_events.processed_at IS NULL
             AND stripe_webhook_events.received_at < NOW() - INTERVAL '10 minutes'
       RETURNING id`,
      [event.id, event.type],
    );
    if (claim.length === 0) {
      // Already processed, or another delivery is actively processing it.
      logger.info(
        { eventType: event.type, eventId: event.id },
        "Duplicate or in-flight Stripe webhook ignored",
      );
      return res.json({ received: true, eventId: event.id });
    }

    try {
      await handleWebhookEvent(event);
    } catch (procErr) {
      // The handler failed *before* committing side effects we can rely on, so
      // release our claim and let Stripe's retry re-process from scratch.
      await query(
        "DELETE FROM stripe_webhook_events WHERE id = $1 AND processed_at IS NULL",
        [event.id],
      ).catch(() => undefined);
      throw procErr;
    }

    // Handler succeeded — side effects are committed. Marking processed is a
    // best-effort finalization: if it fails we must NOT delete the claim (that
    // would let a retry double-apply). Worst case the row stays unmarked and is
    // only re-eligible after the stale window; handlers are idempotent upserts,
    // so the residual risk is a rare, benign re-apply rather than a double spend.
    try {
      await query(
        "UPDATE stripe_webhook_events SET processed_at = NOW() WHERE id = $1",
        [event.id],
      );
    } catch (markErr) {
      logger.error(
        { error: markErr, eventId: event.id, eventType: event.type },
        "Stripe webhook side effects applied but marking processed failed",
      );
    }

    // Log the webhook for audit trail
    try {
      const eventObject = event.data
        ?.object as unknown as Record<string, unknown> | undefined;
      const workspaceId =
        (eventObject?.client_reference_id as string) ||
        (
          eventObject?.metadata as Record<string, string> | undefined
        )?.workspace_id ||
        null;

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

    const body: WebhookResponse = {
      received: true,
      eventId: event.id,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ─── GET /billing/invoices — list invoices ───
router.get(
  "/invoices",
  requireAuth,
  requireWorkspace,
  requireStripeConfig,
  async (req, res, next) => {
    try {
      const workspaceId = req.workspace!.id;

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace?.stripeCustomerId) {
        const emptyResponse: InvoicesResponse = {
          invoices: [],
          hasMore: false,
        };
        res.json(emptyResponse);
        return;
      }

      const limit = Math.min(
        parseInt(req.query.limit as string, 10) || 20,
        100,
      );
      const startingAfter =
        (req.query.startingAfter as string) || undefined;

      const result = await retrieveInvoices({
        customerId: workspace.stripeCustomerId,
        limit,
        startingAfter,
      });

      const body: InvoicesResponse = {
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
          subscriptionId: typeof inv.subscription === "string" ? inv.subscription : (inv.subscription as { id: string } | null)?.id ?? null,
          description: inv.description,
          paid: inv.status === "paid",
        })),
        hasMore: result.hasMore,
      };

      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
