import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpgradePlanUseCase } from './UpgradePlanUseCase';
import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';

vi.mock('../../../services/stripe', () => ({
  comparePlans: vi.fn((from: string, to: string) => {
    const rank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4 };
    return (rank[to] ?? -1) - (rank[from] ?? -1);
  }),
  getPriceForPlan: vi.fn((plan: string) => (plan === 'growth' ? 'price_growth' : null)),
  isBillingCheckoutConfigured: vi.fn(() => true),
}));

const makeRepo = (overrides: Partial<IBillingRepository> = {}): IBillingRepository =>
  ({
    getBillingInfo: vi.fn().mockResolvedValue({
      workspaceId: 'ws-1',
      plan: 'free',
      status: 'inactive',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      credits: {
        creativesUsed: 0,
        creativesTotal: 5,
        impressionsUsed: 0,
        impressionsTotal: 1000,
        aiCreditsUsed: 0,
        aiCreditsTotal: 50,
      },
    }),
    getBillingUsage: vi.fn(),
    getInvoices: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    upgradePlan: vi.fn().mockResolvedValue({
      previousPlan: 'free',
      plan: 'growth',
      priceId: 'price_growth',
      subscriptionId: null,
      checkoutUrl: 'https://checkout.stripe.com/cs_test',
      effective: 'immediate',
    }),
    downgradePlan: vi.fn(),
    updatePlan: vi.fn(),
    cancelSubscription: vi.fn(),
    ...overrides,
  }) as IBillingRepository;

describe('UpgradePlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns checkout flow for free workspaces without a subscription', async () => {
    const repo = makeRepo();
    const result = await new UpgradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userId: 'user-1',
      userEmail: 'owner@test.com',
      userRole: 'owner',
      plan: 'growth',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkoutUrl).toContain('checkout.stripe.com');
      expect(result.data.plan).toBe('growth');
    }
    expect(repo.upgradePlan).toHaveBeenCalled();
  });

  it('rejects non-owner callers', async () => {
    const repo = makeRepo();
    const result = await new UpgradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userId: 'user-1',
      userEmail: 'admin@test.com',
      userRole: 'admin',
      plan: 'growth',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    }
    expect(repo.upgradePlan).not.toHaveBeenCalled();
  });

  it('rejects upgrades to the same or lower plan', async () => {
    const repo = makeRepo({
      getBillingInfo: vi.fn().mockResolvedValue({
        workspaceId: 'ws-1',
        plan: 'growth',
        status: 'active',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        credits: {
          creativesUsed: 0,
          creativesTotal: 200,
          impressionsUsed: 0,
          impressionsTotal: 500000,
          aiCreditsUsed: 0,
          aiCreditsTotal: 5000,
        },
      }),
    });

    const result = await new UpgradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userId: 'user-1',
      userEmail: 'owner@test.com',
      userRole: 'owner',
      plan: 'starter',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Cannot upgrade');
    }
  });
});
