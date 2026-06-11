import type { PlanTier, SubscriptionStatus } from '../entities/Workspace';

export interface BillingInfo {
  workspaceId: string;
  name: string;
  plan: PlanTier;
  status: SubscriptionStatus | 'inactive';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  credits: {
    creativesUsed: number;
    creativesTotal: number;
    impressionsUsed: number;
    impressionsTotal: number;
    aiCreditsUsed: number;
    aiCreditsTotal: number;
  };
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  subscriptionId: string | null;
  description: string | null;
  paid: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string | null;
}

export interface PortalSession {
  url: string | null;
}

export interface PlanChangeResult {
  previousPlan: string;
  plan: string;
  priceId: string | null;
  subscriptionId: string | null;
  checkoutUrl: string | null;
  effective: 'immediate' | 'period_end';
  cancelAtPeriodEnd?: boolean;
}

export interface PlanLimits {
  creatives: number;
  impressions: number;
  aiCredits: number;
}

export interface BillingUsage {
  workspaceId: string;
  plan: PlanTier;
  period: {
    start: string | null;
    end: string | null;
  };
  credits: BillingInfo['credits'];
  /** Per-feature metering is not wired yet; UI should defer breakdown UI when false. */
  detailedBreakdownAvailable: boolean;
}

export interface IBillingRepository {
  getBillingInfo(workspaceId: string): Promise<BillingInfo | null>;
  getBillingUsage(workspaceId: string): Promise<BillingUsage | null>;
  getInvoices(workspaceId: string, limit: number, startingAfter?: string): Promise<{ invoices: Invoice[]; hasMore: boolean }>;
  createCheckoutSession(workspaceId: string, userId: string, email: string, priceId: string, successUrl: string, cancelUrl: string): Promise<CheckoutSession>;
  createPortalSession(workspaceId: string, returnUrl: string): Promise<PortalSession>;
  upgradePlan(
    workspaceId: string,
    userId: string,
    email: string,
    targetPlan: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<PlanChangeResult>;
  downgradePlan(workspaceId: string, targetPlan: string): Promise<PlanChangeResult>;
  updatePlan(workspaceId: string, plan: PlanTier): Promise<void>;
  cancelSubscription(workspaceId: string): Promise<void>;
}
