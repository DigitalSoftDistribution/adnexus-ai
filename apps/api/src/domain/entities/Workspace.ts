export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  ownerId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  branding: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceLimits {
  maxCampaigns: number;
  maxAdAccounts: number;
  maxUsers: number;
  maxAutomations: number;
  maxApiKeys: number;
}

export const PLAN_LIMITS: Record<PlanTier, WorkspaceLimits> = {
  free: { maxCampaigns: 5, maxAdAccounts: 2, maxUsers: 3, maxAutomations: 3, maxApiKeys: 1 },
  starter: { maxCampaigns: 20, maxAdAccounts: 5, maxUsers: 10, maxAutomations: 10, maxApiKeys: 3 },
  pro: { maxCampaigns: 100, maxAdAccounts: 20, maxUsers: 50, maxAutomations: 50, maxApiKeys: 10 },
  enterprise: { maxCampaigns: 1000, maxAdAccounts: 100, maxUsers: 500, maxAutomations: 200, maxApiKeys: 50 },
};
