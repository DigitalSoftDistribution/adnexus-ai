import { describe, it, expect, vi } from 'vitest';
import { CancelSubscriptionUseCase } from './CancelSubscriptionUseCase';
import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';

const makeRepo = (overrides: Partial<IBillingRepository> = {}): IBillingRepository =>
  ({
    getBillingInfo: vi.fn(),
    getInvoices: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    updatePlan: vi.fn(),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as IBillingRepository;

describe('CancelSubscriptionUseCase', () => {
  it('rejects owner cancellation through the local-only path', async () => {
    const repo = makeRepo();
    const result = await new CancelSubscriptionUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'owner' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(400);
      expect(result.error.message).toContain('Stripe billing portal');
    }
    expect(repo.cancelSubscription).not.toHaveBeenCalled();
  });

  it.each(['admin', 'editor', 'analyst', 'viewer'])('denies a %s (only owner may cancel)', async (role) => {
    const repo = makeRepo();
    const result = await new CancelSubscriptionUseCase(repo).execute({ workspaceId: 'ws-1', userRole: role });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.cancelSubscription).not.toHaveBeenCalled();
  });
});
