import { z } from "zod";
import type { PlanTier } from "./workspace";

// ─── Subscription Status ───
export const subscriptionStatusSchema = z.enum([
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "TRIALING",
  "INACTIVE",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

// ─── Checkout Request ───
export const checkoutRequestSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

// ─── Checkout Response ───
export interface CheckoutResponse {
  sessionId: string;
  url: string | null;
}

// ─── Portal Request ───
export const portalRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
  flow: z
    .enum([
      "payment_method_update",
      "subscription_cancel",
      "subscription_update",
      "subscription_update_confirm",
    ])
    .optional(),
});
export type PortalRequest = z.infer<typeof portalRequestSchema>;

// ─── Portal Response ───
export interface PortalResponse {
  url: string;
}

// ─── Subscription Info (GET /billing/subscription) ───
export interface SubscriptionInfo {
  workspaceId: string;
  name: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  hasPaymentMethod: boolean | null;
}

// ─── Credit Usage ───
export interface CreditUsage {
  creativesUsed: number;
  creativesTotal: number;
  impressionsUsed: number;
  impressionsTotal: number;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
}

// ─── Billing Overview (GET /billing) ───
export interface BillingOverview {
  workspaceId: string;
  name: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  credits: CreditUsage;
}

// ─── Invoice ───
export interface InvoiceInfo {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string | number;
  periodStart: string | number | null;
  periodEnd: string | number | null;
  pdfUrl: string | null | undefined;
  hostedUrl: string | null | undefined;
  subscriptionId: string | null;
  description: string | null;
  paid: boolean;
}

// ─── Invoices Response ───
export interface InvoicesResponse {
  invoices: InvoiceInfo[];
  hasMore: boolean;
}

// ─── Webhook Response ───
export interface WebhookResponse {
  received: boolean;
  eventId: string;
}

// ─── Plan Limits (billing-specific plan limits map) ───
export const BILLING_PLAN_LIMITS: Record<string, { creatives: number; impressions: number; aiCredits: number }> = {
  FREE: { creatives: 5, impressions: 1000, aiCredits: 50 },
  GROWTH: { creatives: 50, impressions: 50000, aiCredits: 500 },
  TEAM: { creatives: 200, impressions: 500000, aiCredits: 5000 },
  AGENCY: { creatives: 1000, impressions: 2000000, aiCredits: 25000 },
};

export function getPlanLimits(plan: PlanTier) {
  return BILLING_PLAN_LIMITS[plan] ?? BILLING_PLAN_LIMITS.FREE;
}
