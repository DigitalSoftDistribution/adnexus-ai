import type { IBillingRepository, BillingInfo, Invoice, CheckoutSession, PortalSession } from '../../domain/repositories/IBillingRepository';
import type { PlanTier } from '../../domain/entities/Workspace';
import { db } from '../../db';
import { workspaces, workspaceCredits } from '../../db/schema';
import { eq } from 'drizzle-orm';
import {
  createStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  retrieveInvoices,
} from '../../services/stripe';

const PLAN_LIMITS: Record<string, { creatives: number; impressions: number; aiCredits: number }> = {
  free: { creatives: 5, impressions: 1000, aiCredits: 50 },
  starter: { creatives: 50, impressions: 50000, aiCredits: 500 },
  growth: { creatives: 200, impressions: 500000, aiCredits: 5000 },
  pro: { creatives: 1000, impressions: 2000000, aiCredits: 25000 },
  enterprise: { creatives: -1, impressions: -1, aiCredits: -1 },
};

export class BillingRepository implements IBillingRepository {
  async getBillingInfo(workspaceId: string): Promise<BillingInfo | null> {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) return null;

    const creditRow = await db.query.workspaceCredits.findFirst({
      where: eq(workspaceCredits.workspaceId, workspaceId),
    });

    const currentPlan = (workspace.plan || 'free') as PlanTier;
    const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

    return {
      workspaceId: workspace.id,
      name: workspace.name || '',
      plan: currentPlan,
      status: (workspace.subscriptionStatus as any) || 'inactive',
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
    };
  }

  async getInvoices(workspaceId: string, limit: number, startingAfter?: string): Promise<{ invoices: Invoice[]; hasMore: boolean }> {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace?.stripeCustomerId) {
      return { invoices: [], hasMore: false };
    }

    const result = await retrieveInvoices({
      customerId: workspace.stripeCustomerId,
      limit,
      startingAfter,
    });

    const invoices: Invoice[] = result.invoices.map((inv: any) => ({
      id: inv.id,
      number: inv.number || null,
      status: inv.status || null,
      amountDue: inv.amount_due || 0,
      amountPaid: inv.amount_paid || 0,
      currency: inv.currency || 'usd',
      created: inv.created || 0,
      periodStart: inv.period_start || null,
      periodEnd: inv.period_end || null,
      pdfUrl: inv.invoice_pdf || null,
      hostedUrl: inv.hosted_invoice_url || null,
      subscriptionId: inv.subscription || null,
      description: inv.description || null,
      paid: inv.status === 'paid',
    }));

    return { invoices, hasMore: result.hasMore };
  }

  async createCheckoutSession(
    workspaceId: string,
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession> {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer({
        email,
        name: email,
        workspaceId: workspace.id,
        userId,
      });

      await db
        .update(workspaces)
        .set({ stripeCustomerId: customerId })
        .where(eq(workspaces.id, workspaceId));
    }

    const session = await createCheckoutSession({
      customerId,
      priceId,
      workspaceId,
      userId,
      successUrl,
      cancelUrl,
    });

    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(workspaceId: string, returnUrl: string): Promise<PortalSession> {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this workspace');
    }

    const session = await createPortalSession({
      customerId: workspace.stripeCustomerId,
      returnUrl,
    });

    return { url: session.url };
  }

  async updatePlan(workspaceId: string, plan: PlanTier): Promise<void> {
    await db
      .update(workspaces)
      .set({ plan, updated_at: new Date() })
      .where(eq(workspaces.id, workspaceId));
  }

  async cancelSubscription(workspaceId: string): Promise<void> {
    // This is handled by Stripe webhooks — we just update the local state
    await db
      .update(workspaces)
      .set({
        plan: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        updated_at: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
  }
}
