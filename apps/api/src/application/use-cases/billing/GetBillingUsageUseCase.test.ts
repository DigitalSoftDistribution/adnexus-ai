import { describe, it, expect, vi } from 'vitest';
import { GetBillingUsageUseCase } from './GetBillingUsageUseCase';
import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';

const sampleUsage = {
  workspaceId: 'ws-1',
  plan: 'free' as const,
  period: { start: null, end: null },
  credits: {
    creativesUsed: 2,
    creativesTotal: 5,
    impressionsUsed: 100,
    impressionsTotal: 1000,
    aiCreditsUsed: 10,
    aiCreditsTotal: 50,
  },
  detailedBreakdownAvailable: false,
};

const makeRepo = (overrides: Partial<IBillingRepository> = {}): IBillingRepository =>
  ({
    getBillingInfo: vi.fn(),
    getBillingUsage: vi.fn().mockResolvedValue(sampleUsage),
    getInvoices: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    upgradePlan: vi.fn(),
    downgradePlan: vi.fn(),
    updatePlan: vi.fn(),
    cancelSubscription: vi.fn(),
    ...overrides,
  }) as IBillingRepository;

describe('GetBillingUsageUseCase', () => {
  it('returns usage for viewers and above', async () => {
    const repo = makeRepo();
    const result = await new GetBillingUsageUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'viewer' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.credits.aiCreditsUsed).toBe(10);
      expect(result.data.detailedBreakdownAvailable).toBe(false);
    }
  });

  it('returns 404 when workspace usage is missing', async () => {
    const repo = makeRepo({ getBillingUsage: vi.fn().mockResolvedValue(null) });
    const result = await new GetBillingUsageUseCase(repo).execute({ workspaceId: 'ws-missing', userRole: 'owner' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(404);
    }
  });

  it('denies unknown roles', async () => {
    const repo = makeRepo();
    const result = await new GetBillingUsageUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'guest' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    }
  });
});
