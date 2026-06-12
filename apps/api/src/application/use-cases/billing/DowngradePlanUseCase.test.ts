import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DowngradePlanUseCase } from './DowngradePlanUseCase';
import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';

vi.mock('../../../services/stripe', () => ({
  comparePlans: vi.fn((from: string, to: string) => {
    const rank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4 };
    return (rank[to] ?? -1) - (rank[from] ?? -1);
  }),
  getPlanRank: vi.fn((plan: string) => {
    const rank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4 };
    return rank[plan] ?? -1;
  }),
  getPriceForPlan: vi.fn((plan: string) => (plan === 'starter' ? 'price_starter' : null)),
  isBillingCheckoutConfigured: vi.fn(() => true),
}));

const paidBillingInfo = {
  workspaceId: 'ws-1',
  plan: 'growth',
  status: 'active',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-06-30T23:59:59.000Z'),
  cancelAtPeriodEnd: false,
  credits: {
    creativesUsed: 0,
    creativesTotal: 200,
    impressionsUsed: 0,
    impressionsTotal: 500000,
    aiCreditsUsed: 0,
    aiCreditsTotal: 5000,
  },
};

const makeRepo = (overrides: Partial<IBillingRepository> = {}): IBillingRepository =>
  ({
    getBillingInfo: vi.fn().mockResolvedValue(paidBillingInfo),
    getBillingUsage: vi.fn(),
    getInvoices: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    upgradePlan: vi.fn(),
    downgradePlan: vi.fn().mockResolvedValue({
      previousPlan: 'growth',
      plan: 'starter',
      priceId: 'price_starter',
      subscriptionId: 'sub_1',
      checkoutUrl: null,
      effective: 'immediate',
    }),
    updatePlan: vi.fn(),
    cancelSubscription: vi.fn(),
    ...overrides,
  }) as IBillingRepository;

describe('DowngradePlanUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downgrades an active subscription to a lower paid tier', async () => {
    const repo = makeRepo();
    const result = await new DowngradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userRole: 'owner',
      plan: 'starter',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toBe('starter');
      expect(result.data.effective).toBe('immediate');
    }
    expect(repo.downgradePlan).toHaveBeenCalledWith('ws-1', 'starter');
  });

  it('rejects downgrades from the free plan', async () => {
    const repo = makeRepo({
      getBillingInfo: vi.fn().mockResolvedValue({
        ...paidBillingInfo,
        plan: 'free',
        stripeSubscriptionId: null,
      }),
    });

    const result = await new DowngradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userRole: 'owner',
      plan: 'free',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('No paid subscription');
    }
  });

  it('rejects upgrades disguised as downgrades', async () => {
    const repo = makeRepo();
    const result = await new DowngradePlanUseCase(repo).execute({
      workspaceId: 'ws-1',
      userRole: 'owner',
      plan: 'pro',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Cannot downgrade');
    }
  });
});
