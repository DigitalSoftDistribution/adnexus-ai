import Stripe from "stripe";
import { db } from "../db";
import { workspaces, workspaceCredits, auditLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";

// ─── Initialize Stripe client ───
const apiKey = process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  logger.error("STRIPE_SECRET_KEY is not set — billing will be disabled");
}

export const stripe = new Stripe(apiKey || "sk_placeholder", {
  apiVersion: "2024-06-20",
  typescript: true,
});

// ─── Plan mapping from Stripe Price IDs to internal plan names ───
//
// Production must provide this mapping via environment. Supported forms:
//   STRIPE_PRICE_STARTER=price_...
//   STRIPE_PRICE_GROWTH=price_...
//   STRIPE_PRICE_PRO=price_...
//   STRIPE_PRICE_ENTERPRISE=price_...
// or the equivalent STRIPE_PRICE_ID_<PLAN> variables.
//
// We intentionally do not default unknown webhook prices to a paid/free plan: a
// missing mapping means billing is misconfigured and must fail loudly so Stripe
// retries after configuration is fixed.
const BILLABLE_PLANS = ["starter", "growth", "pro", "enterprise"] as const;

function buildPriceMappings() {
  const priceToPlan: Record<string, string> = {};
  const planToPrice: Record<string, string> = {};

  for (const plan of BILLABLE_PLANS) {
    const envKey = plan.toUpperCase();
    const priceId =
      process.env[`STRIPE_PRICE_${envKey}`]
      || process.env[`STRIPE_PRICE_ID_${envKey}`]
      || "";

    if (!priceId.trim()) continue;

    priceToPlan[priceId.trim()] = plan;
    planToPrice[plan] = priceId.trim();
  }

  return { priceToPlan, planToPrice };
}

const initialMappings = buildPriceMappings();
export const PRICE_TO_PLAN: Record<string, string> = initialMappings.priceToPlan;
export const PLAN_TO_PRICE: Record<string, string> = initialMappings.planToPrice;

export const PLAN_LIMITS: Record<string, { creatives: number; impressions: number; aiCredits: number }> = {
  free: { creatives: 5, impressions: 1000, aiCredits: 50 },
  starter: { creatives: 50, impressions: 50000, aiCredits: 500 },
  growth: { creatives: 200, impressions: 500000, aiCredits: 5000 },
  pro: { creatives: 1000, impressions: 2000000, aiCredits: 25000 },
  enterprise: { creatives: -1, impressions: -1, aiCredits: -1 },
};

export function getPlanForPrice(priceId?: string | null): string | null {
  if (!priceId) return null;
  return PRICE_TO_PLAN[priceId] ?? null;
}

export function getPriceForPlan(plan: string): string | null {
  return PLAN_TO_PRICE[plan] ?? null;
}

export function getConfiguredPlans() {
  return Object.entries(PLAN_TO_PRICE).map(([plan, priceId]) => ({
    plan,
    priceId,
    limits: PLAN_LIMITS[plan],
  }));
}

export function isStripeSecretConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_");
}

export function isBillingCheckoutConfigured(): boolean {
  return isStripeSecretConfigured() && Object.keys(PRICE_TO_PLAN).length > 0;
}

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4,
};

export function getPlanRank(plan: string): number {
  return PLAN_RANK[plan.toLowerCase()] ?? -1;
}

export function comparePlans(fromPlan: string, toPlan: string): number {
  return getPlanRank(toPlan) - getPlanRank(fromPlan);
}

function assertStripeConfigured(operation: string): void {
  if (!isStripeSecretConfigured()) {
    throw new Error(`Stripe is not configured; cannot ${operation}`);
  }
}

function assertKnownPrice(priceId?: string | null): string {
  const planName = getPlanForPrice(priceId);
  if (!planName) {
    throw new Error(`Stripe price ${priceId || "<missing>"} is not mapped to an AdNexus plan`);
  }
  return planName;
}

// ─── Types ───
interface CreateCustomerParams {
  email: string;
  name?: string;
  workspaceId: string;
  userId: string;
}

interface CreateCheckoutParams {
  customerId: string;
  priceId: string;
  workspaceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreatePortalParams {
  customerId: string;
  returnUrl: string;
  flow?: Stripe.BillingPortal.SessionCreateParams.FlowData.Type;
}

interface RetrieveInvoicesParams {
  customerId: string;
  limit: number;
  startingAfter?: string;
}

// ─── Create Stripe Customer ───
export async function createStripeCustomer(params: CreateCustomerParams): Promise<string> {
  assertStripeConfigured("create a Stripe customer");
  const { email, name, workspaceId, userId } = params;

  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      workspace_id: workspaceId,
      user_id: userId,
    },
  });

  logger.info({ customerId: customer.id, workspaceId }, "Stripe customer created");

  return customer.id;
}

// ─── Create Checkout Session ───
export async function createCheckoutSession(params: CreateCheckoutParams) {
  assertStripeConfigured("create a checkout session");
  const { customerId, priceId, workspaceId, userId, successUrl, cancelUrl } = params;
  assertKnownPrice(priceId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: workspaceId,
    metadata: {
      workspace_id: workspaceId,
      user_id: userId,
      price_id: priceId,
    },
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
        user_id: userId,
      },
      trial_period_days: 14, // 14-day free trial
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  logger.info(
    { sessionId: session.id, workspaceId, priceId },
    "Stripe checkout session created"
  );

  return session;
}

// ─── Change subscription plan (existing subscriber) ───
export async function changeSubscriptionPlan(params: {
  subscriptionId: string;
  newPriceId: string;
  prorationBehavior?: Stripe.SubscriptionUpdateParams.ProrationBehavior;
}) {
  assertStripeConfigured("change subscription plan");
  assertKnownPrice(params.newPriceId);

  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Subscription has no billable items");
  }

  return stripe.subscriptions.update(params.subscriptionId, {
    items: [{ id: itemId, price: params.newPriceId }],
    proration_behavior: params.prorationBehavior ?? "create_prorations",
    metadata: subscription.metadata,
  });
}

export async function scheduleSubscriptionCancellation(subscriptionId: string) {
  assertStripeConfigured("schedule subscription cancellation");
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function applyWorkspaceSubscriptionSnapshot(
  workspaceId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id;
  const planName = assertKnownPrice(priceId);

  await updateWorkspacePlan(workspaceId, {
    plan: planName,
    status: subscription.status,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

// ─── Create Customer Portal Session ───
export async function createPortalSession(params: CreatePortalParams) {
  assertStripeConfigured("create a billing portal session");
  const { customerId, returnUrl, flow } = params;

  const sessionConfig: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: returnUrl,
  };

  if (flow) {
    sessionConfig.flow_data = {
      type: flow,
      after_completion: {
        type: "redirect",
        redirect: {
          return_url: returnUrl,
        },
      },
    };
  }

  const session = await stripe.billingPortal.sessions.create(sessionConfig);

  logger.info({ sessionId: session.id, customerId }, "Stripe portal session created");

  return session;
}

// ─── Retrieve Invoices ───
export async function retrieveInvoices(params: RetrieveInvoicesParams) {
  assertStripeConfigured("retrieve invoices");
  const { customerId, limit, startingAfter } = params;

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
    starting_after: startingAfter,
    expand: ["data.subscription"],
  });

  return {
    invoices: invoices.data,
    hasMore: invoices.has_more,
  };
}

// ─── Handle Webhook Events ───
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  logger.info({ eventType: event.type }, "Processing Stripe webhook event");

  switch (event.type) {
    // ─── Subscription Created ───
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && session.subscription) {
        const workspaceId = session.metadata?.workspace_id;

        if (!workspaceId) {
          logger.error({ sessionId: session.id }, "No workspace_id in checkout session metadata");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const priceId = subscription.items.data[0]?.price.id;
        const planName = assertKnownPrice(priceId);

        await updateWorkspacePlan(workspaceId, {
          plan: planName,
          status: subscription.status,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // Reset usage counters on new subscription
        await resetUsageCounters(workspaceId);

        logger.info({ workspaceId, plan: planName, subscriptionId: subscription.id }, "Subscription activated");
      }
      break;
    }

    // ─── Subscription Updated ───
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspace_id;

      if (!workspaceId) {
        // Try to find workspace by subscription ID
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.stripeSubscriptionId, subscription.id),
        });
        if (!ws) {
          logger.error({ subscriptionId: subscription.id }, "Cannot find workspace for subscription update");
          break;
        }

        await updateWorkspacePlan(ws.id, {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
      } else {
        const priceId = subscription.items.data[0]?.price.id;
        const planName = assertKnownPrice(priceId);

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };

        if (planName) {
          updateData.plan = planName;
        }

        await updateWorkspacePlan(workspaceId, updateData);
      }

      logger.info({ subscriptionId: subscription.id, status: subscription.status }, "Subscription updated");
      break;
    }

    // ─── Subscription Cancelled ───
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspace_id;

      if (!workspaceId) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.stripeSubscriptionId, subscription.id),
        });
        if (ws) {
          await updateWorkspacePlan(ws.id, {
            plan: "free",
            status: "cancelled",
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false,
          });
          logger.info({ workspaceId: ws.id }, "Subscription deleted, downgraded to free");
        }
      } else {
        await updateWorkspacePlan(workspaceId, {
          plan: "free",
          status: "cancelled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
        });
        logger.info({ workspaceId }, "Subscription deleted, downgraded to free");
      }
      break;
    }

    // ─── Payment Failed ───
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      logger.warn(
        {
          invoiceId: invoice.id,
          subscriptionId,
          attemptCount: invoice.attempt_count,
          customerId: invoice.customer,
        },
        "Invoice payment failed"
      );

      // Find workspace by subscription
      const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.stripeSubscriptionId, subscriptionId),
      });

      if (ws) {
        await db
          .update(workspaces)
          .set({
            subscriptionStatus: "past_due",
            updated_at: new Date(),
          })
          .where(eq(workspaces.id, ws.id));

        // Log the failure
        await db.insert(auditLogs).values({
          workspaceId: ws.id,
          userId: "stripe",
          action: "billing.payment_failed",
          entityType: "invoice",
          entityId: invoice.id,
          metadata: {
            amount: invoice.amount_due,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt,
          },
          created_at: new Date(),
        });

        // Send notification to workspace members (implement your own notify)
        logger.warn({ workspaceId: ws.id, invoiceId: invoice.id }, "Payment failed notification queued");
      }

      break;
    }

    // ─── Payment Succeeded ───
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.stripeSubscriptionId, subscriptionId),
      });

      if (ws && ws.subscriptionStatus === "past_due") {
        await db
          .update(workspaces)
          .set({
            subscriptionStatus: "active",
            updated_at: new Date(),
          })
          .where(eq(workspaces.id, ws.id));

        logger.info({ workspaceId: ws.id, invoiceId: invoice.id }, "Payment succeeded, subscription reactivated");
      }

      break;
    }

    // ─── Subscription Trial Will End ───
    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspace_id;

      logger.info(
        { subscriptionId: subscription.id, workspaceId },
        "Subscription trial ending soon"
      );

      // Send trial ending notification
      if (workspaceId) {
        await db.insert(auditLogs).values({
          workspaceId,
          userId: "stripe",
          action: "billing.trial_ending",
          entityType: "subscription",
          entityId: subscription.id,
          metadata: {
            trialEnd: subscription.trial_end,
            currentPeriodEnd: subscription.current_period_end,
          },
          created_at: new Date(),
        });
      }

      break;
    }

    // ─── Unhandled Events ───
    default:
      logger.debug({ eventType: event.type }, "Unhandled Stripe webhook event");
  }
}

// ─── Update workspace plan in DB ───
async function updateWorkspacePlan(
  workspaceId: string,
  data: {
    plan?: string;
    status?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (data.plan !== undefined) updateData.plan = data.plan;
  if (data.status !== undefined) updateData.subscriptionStatus = data.status;
  if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
  if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
  if (data.currentPeriodStart !== undefined) updateData.currentPeriodStart = data.currentPeriodStart;
  if (data.currentPeriodEnd !== undefined) updateData.currentPeriodEnd = data.currentPeriodEnd;
  if (data.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;

  await db.update(workspaces).set(updateData).where(eq(workspaces.id, workspaceId));

  // Ensure credit row exists with updated limits
  const limits = PLAN_LIMITS[data.plan || "free"] || PLAN_LIMITS.free;

  await db
    .insert(workspaceCredits)
    .values({
      workspaceId,
      creativesUsed: 0,
      impressionsUsed: 0,
      aiCreditsUsed: 0,
      creativesTotal: limits.creatives,
      impressionsTotal: limits.impressions,
      aiCreditsTotal: limits.aiCredits,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceCredits.workspaceId,
      set: {
        creativesTotal: limits.creatives,
        impressionsTotal: limits.impressions,
        aiCreditsTotal: limits.aiCredits,
        updated_at: new Date(),
      },
    });

  logger.info({ workspaceId, ...data }, "Workspace plan updated");
}

// ─── Reset usage counters ───
async function resetUsageCounters(workspaceId: string): Promise<void> {
  await db
    .update(workspaceCredits)
    .set({
      creativesUsed: 0,
      impressionsUsed: 0,
      aiCreditsUsed: 0,
      updated_at: new Date(),
    })
    .where(eq(workspaceCredits.workspaceId, workspaceId));

  logger.info({ workspaceId }, "Usage counters reset");
}

// ─── Graceful degradation check ───
export function isBillingEnabled(): boolean {
  return isBillingCheckoutConfigured();
}
