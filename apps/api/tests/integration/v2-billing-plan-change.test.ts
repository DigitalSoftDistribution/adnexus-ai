import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockWorkspaces, UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

jest.mock('../../src/lib/supabase', () => {
  const from = jest.fn();
  const auth = {
    admin: { listUsers: jest.fn(), createUser: jest.fn(), getUserById: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
  };
  return { supabase: { from, auth } };
});

const mockWorkspacesFindFirst = jest.fn<() => Promise<unknown>>();
const mockCreditsFindFirst = jest.fn<() => Promise<unknown>>();

jest.mock('../../src/db', () => ({
  db: {
    query: {
      workspaces: { findFirst: (...a: unknown[]) => mockWorkspacesFindFirst(...(a as [])) },
      workspaceCredits: { findFirst: (...a: unknown[]) => mockCreditsFindFirst(...(a as [])) },
    },
    update: jest.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
    insert: jest.fn(() => ({ values: () => Promise.resolve(undefined) })),
  },
}));

jest.mock('../../src/db/schema', () => ({
  workspaces: { id: 'id' },
  workspaceCredits: { workspaceId: 'workspaceId' },
  auditLogs: {},
}));

const mockCreateCheckoutSession = jest.fn<() => Promise<unknown>>();
const mockChangeSubscriptionPlan = jest.fn<() => Promise<unknown>>();
const mockScheduleSubscriptionCancellation = jest.fn<() => Promise<unknown>>();
const mockApplyWorkspaceSubscriptionSnapshot = jest.fn<() => Promise<unknown>>();
const mockCreateStripeCustomer = jest.fn<() => Promise<string>>();

jest.mock('../../src/services/stripe', () => ({
  createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...(a as [])),
  createPortalSession: jest.fn(),
  createStripeCustomer: (...a: unknown[]) => mockCreateStripeCustomer(...(a as [])),
  retrieveInvoices: jest.fn(),
  changeSubscriptionPlan: (...a: unknown[]) => mockChangeSubscriptionPlan(...(a as [])),
  scheduleSubscriptionCancellation: (...a: unknown[]) => mockScheduleSubscriptionCancellation(...(a as [])),
  applyWorkspaceSubscriptionSnapshot: (...a: unknown[]) => mockApplyWorkspaceSubscriptionSnapshot(...(a as [])),
  PLAN_LIMITS: {
    free: { creatives: 5, impressions: 1000, aiCredits: 50 },
    starter: { creatives: 50, impressions: 50000, aiCredits: 500 },
    growth: { creatives: 200, impressions: 500000, aiCredits: 5000 },
    pro: { creatives: 1000, impressions: 2000000, aiCredits: 25000 },
    enterprise: { creatives: -1, impressions: -1, aiCredits: -1 },
  },
  getConfiguredPlans: jest.fn(() => [
    { plan: 'starter', priceId: 'price_starter', limits: { creatives: 50, impressions: 50000, aiCredits: 500 } },
    { plan: 'growth', priceId: 'price_growth', limits: { creatives: 200, impressions: 500000, aiCredits: 5000 } },
  ]),
  getPlanForPrice: jest.fn((priceId: string) => {
    if (priceId === 'price_growth') return 'growth';
    if (priceId === 'price_starter') return 'starter';
    return null;
  }),
  getPriceForPlan: jest.fn((plan: string) => {
    if (plan === 'growth') return 'price_growth';
    if (plan === 'starter') return 'price_starter';
    return null;
  }),
  comparePlans: jest.fn((from: string, to: string) => {
    const rank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4 };
    return (rank[to] ?? -1) - (rank[from] ?? -1);
  }),
  getPlanRank: jest.fn((plan: string) => {
    const rank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4 };
    return rank[plan] ?? -1;
  }),
  isBillingCheckoutConfigured: jest.fn(() => true),
  isStripeSecretConfigured: jest.fn(() => true),
  handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
  isBillingEnabled: jest.fn().mockReturnValue(true),
  stripe: { webhooks: { constructEvent: jest.fn() } },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

function usersBuilder() {
  const b: Record<string, unknown> = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
  };
  return b;
}

const WS_ID = mockWorkspaces.free.id;

const freeWorkspace = {
  id: WS_ID,
  name: 'Test Workspace',
  plan: 'free',
  subscriptionStatus: 'inactive',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const growthWorkspace = {
  ...freeWorkspace,
  plan: 'growth',
  subscriptionStatus: 'active',
  stripeCustomerId: 'cus_test',
  stripeSubscriptionId: 'sub_test',
  currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-06-30T23:59:59.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(() => usersBuilder());
  mockWorkspacesFindFirst.mockResolvedValue(undefined);
  mockCreditsFindFirst.mockResolvedValue({
    creativesUsed: 0,
    impressionsUsed: 0,
    aiCreditsUsed: 0,
  });
});

describe('POST /api/v2/billing/upgrade', () => {
  it('returns a checkout URL for free workspaces without a subscription', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue(freeWorkspace);
    mockCreateStripeCustomer.mockResolvedValue('cus_new');
    mockCreateCheckoutSession.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/cs_test' });

    const response = await request(app)
      .post('/api/v2/billing/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ plan: 'growth' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      previousPlan: 'free',
      plan: 'growth',
      checkoutUrl: 'https://checkout.stripe.com/cs_test',
      effective: 'immediate',
    });
  });

  it('updates an existing subscription immediately for paid upgrades', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({
      ...growthWorkspace,
      plan: 'starter',
      stripeSubscriptionId: 'sub_starter',
    });
    mockChangeSubscriptionPlan.mockResolvedValue({
      id: 'sub_starter',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1717200000,
      current_period_end: 1719792000,
      items: { data: [{ price: { id: 'price_growth' } }] },
    });

    const response = await request(app)
      .post('/api/v2/billing/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ plan: 'growth' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      previousPlan: 'starter',
      plan: 'growth',
      checkoutUrl: null,
      effective: 'immediate',
    });
    expect(mockChangeSubscriptionPlan).toHaveBeenCalled();
    expect(mockApplyWorkspaceSubscriptionSnapshot).toHaveBeenCalled();
  });

  it('requires owner role', async () => {
    const token = generateToken(UUIDS.owner, 'admin', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue(freeWorkspace);

    const response = await request(app)
      .post('/api/v2/billing/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ plan: 'growth' });

    expect(response.status).toBe(403);
  });
});

describe('POST /api/v2/billing/downgrade', () => {
  it('downgrades to a lower paid tier immediately', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue(growthWorkspace);
    mockChangeSubscriptionPlan.mockResolvedValue({
      id: 'sub_test',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1717200000,
      current_period_end: 1719792000,
      items: { data: [{ price: { id: 'price_starter' } }] },
    });

    const response = await request(app)
      .post('/api/v2/billing/downgrade')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ plan: 'starter' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      previousPlan: 'growth',
      plan: 'starter',
      effective: 'immediate',
    });
  });

  it('schedules cancellation when downgrading to free', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue(growthWorkspace);
    mockScheduleSubscriptionCancellation.mockResolvedValue({
      id: 'sub_test',
      cancel_at_period_end: true,
      current_period_end: 1719792000,
    });

    const response = await request(app)
      .post('/api/v2/billing/downgrade')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ plan: 'free' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      previousPlan: 'growth',
      plan: 'growth',
      effective: 'period_end',
      cancelAtPeriodEnd: true,
    });
    expect(mockScheduleSubscriptionCancellation).toHaveBeenCalledWith('sub_test');
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/v2/billing/downgrade')
      .send({ plan: 'starter' });

    expect(response.status).toBe(401);
  });
});
