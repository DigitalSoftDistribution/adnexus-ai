// ============================================
// AdNexus AI — E2E: Billing plan-upgrade -> Stripe webhook -> credits (P0-5)
// ============================================
// Exercises the critical revenue flow end to end at the service boundary:
// a Stripe `checkout.session.completed` webhook upgrades the workspace plan,
// (re)provisions the plan's credit limits, and resets usage counters.
//
// We mock the Drizzle `db` and the Stripe SDK so the test is deterministic and
// offline, but drive the REAL handleWebhookEvent() logic (price->plan mapping,
// update + upsert + reset ordering).

import { jest } from '@jest/globals';

// ─── Mock the Stripe SDK + service deps ──────────────────────────
// PRICE_TO_PLAN maps a configured price id to a plan; pick the growth price.
const GROWTH_PRICE = 'price_growth_test';

// Capture db mutations.
const updateSet = jest.fn();
const insertValues = jest.fn();
const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
const updateWhere = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/db', () => ({
  db: {
    update: jest.fn(() => ({ set: (...a: unknown[]) => { updateSet(...a); return { where: (...b: unknown[]) => updateWhere(...b) }; } })),
    insert: jest.fn(() => ({ values: (...a: unknown[]) => { insertValues(...a); return { onConflictDoUpdate: (...b: unknown[]) => onConflictDoUpdate(...b) }; } })),
    query: { workspaces: { findFirst: jest.fn().mockResolvedValue(null) } },
  },
}));

// Mock the Stripe client used inside the service (subscriptions.retrieve).
const subscriptionsRetrieve = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: { retrieve: (...a: unknown[]) => subscriptionsRetrieve(...a) },
    webhooks: { constructEvent: jest.fn() },
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    invoices: { list: jest.fn() },
  }));
});

// Configure the price->plan map BEFORE importing the service.
process.env.STRIPE_PRICE_GROWTH = GROWTH_PRICE;

import { handleWebhookEvent, PRICE_TO_PLAN } from '../../src/services/stripe';

describe('E2E: billing plan-upgrade -> Stripe webhook -> credits', () => {
  const WORKSPACE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Make the growth price resolve to a known plan for the assertion.
    PRICE_TO_PLAN[GROWTH_PRICE] = 'growth';
  });

  it('checkout.session.completed upgrades plan, provisions credits, resets usage', async () => {
    const now = Math.floor(Date.now() / 1000);
    subscriptionsRetrieve.mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: now,
      current_period_end: now + 30 * 24 * 3600,
      items: { data: [{ price: { id: GROWTH_PRICE } }] },
    });

    const event = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          mode: 'subscription',
          subscription: 'sub_test_123',
          customer: 'cus_test_1',
          metadata: { workspace_id: WORKSPACE_ID },
        },
      },
    } as any;

    await handleWebhookEvent(event);

    // 1) Stripe subscription was retrieved for the session.
    expect(subscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123');

    // 2) The workspace plan was updated to 'growth' + active subscription.
    const planUpdate = updateSet.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .find((u) => u.plan === 'growth');
    expect(planUpdate).toBeDefined();
    expect(planUpdate).toMatchObject({
      plan: 'growth',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_123',
      cancelAtPeriodEnd: false,
    });

    // 3) Credit limits were (re)provisioned for the new plan via upsert.
    expect(insertValues).toHaveBeenCalled();
    const creditValues = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(creditValues).toMatchObject({ workspaceId: WORKSPACE_ID });
    expect(onConflictDoUpdate).toHaveBeenCalled();

    // 4) Usage counters were reset (a second update with zeroed usage).
    const usageReset = updateSet.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .find((u) => u.creativesUsed === 0 && u.impressionsUsed === 0 && u.aiCreditsUsed === 0);
    expect(usageReset).toBeDefined();
  });
});
