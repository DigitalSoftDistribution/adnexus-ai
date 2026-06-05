import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockWorkspaces, UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase (auth middleware only) ────────────────────────
//
// The billing routes themselves are Drizzle/Stripe-backed, but the shared
// requireAuth middleware verifies the caller via supabase from('users').single().
// jest.mock is hoisted, so build the mock in the factory and retrieve it after.
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

// ─── Mock the Drizzle db layer ───────────────────────────────────
const mockWorkspacesFindFirst = jest.fn<() => Promise<unknown>>();
const mockCreditsFindFirst = jest.fn<() => Promise<unknown>>();
const mockDbUpdate = jest.fn();
const mockDbInsert = jest.fn();

jest.mock('../../src/db', () => ({
  db: {
    query: {
      workspaces: { findFirst: (...a: unknown[]) => mockWorkspacesFindFirst(...(a as [])) },
      workspaceCredits: { findFirst: (...a: unknown[]) => mockCreditsFindFirst(...(a as [])) },
    },
    update: (...a: unknown[]) => {
      mockDbUpdate(...a);
      return { set: () => ({ where: () => Promise.resolve(undefined) }) };
    },
    insert: (...a: unknown[]) => {
      mockDbInsert(...a);
      return { values: () => Promise.resolve(undefined) };
    },
  },
}));

jest.mock('../../src/db/schema', () => ({
  workspaces: { id: 'id' },
  workspaceCredits: { workspaceId: 'workspaceId' },
  auditLogs: {},
}));

// ─── Mock the Stripe service ─────────────────────────────────────
const mockCreateCheckoutSession = jest.fn<() => Promise<unknown>>();
const mockCreatePortalSession = jest.fn<() => Promise<unknown>>();
const mockCreateStripeCustomer = jest.fn<() => Promise<string>>();
const mockRetrieveInvoices = jest.fn<() => Promise<unknown>>();

jest.mock('../../src/services/stripe', () => ({
  createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...(a as [])),
  createPortalSession: (...a: unknown[]) => mockCreatePortalSession(...(a as [])),
  createStripeCustomer: (...a: unknown[]) => mockCreateStripeCustomer(...(a as [])),
  retrieveInvoices: (...a: unknown[]) => mockRetrieveInvoices(...(a as [])),
  getConfiguredPlans: jest.fn(() => [{ plan: 'growth', priceId: 'price_123', limits: { creatives: 200, impressions: 500000, aiCredits: 5000 } }]),
  getPlanForPrice: jest.fn((priceId: string) => priceId === 'price_123' ? 'growth' : null),
  isBillingCheckoutConfigured: jest.fn(() => true),
  isStripeSecretConfigured: jest.fn(() => true),
  handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
  stripe: { webhooks: { constructEvent: jest.fn() } },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Auth middleware verifies caller via from('users').single(); resolve to a valid user. */
function usersBuilder() {
  const b: Record<string, unknown> = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
  };
  return b;
}

const WS_ID = mockWorkspaces.free.id;

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(() => usersBuilder());
  mockWorkspacesFindFirst.mockResolvedValue(undefined);
  mockCreditsFindFirst.mockResolvedValue(undefined);
});

// ─── Suite: GET /billing — current plan, usage, credits ──────────

describe('GET /api/v1/billing', () => {
  it('should return billing details for free plan', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({
      id: WS_ID,
      name: "Test Workspace",
      plan: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: null,
    });
    mockCreditsFindFirst.mockResolvedValue({
      creativesUsed: 2,
      impressionsUsed: 100,
      aiCreditsUsed: 10,
    });

    // Act — requireWorkspace reads the workspace from the x-workspace-id header.
    const response = await request(app)
      .get('/api/v1/billing')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert — this route returns the billing object directly (no success envelope).
    expect(response.status).toBe(200);
    expect(response.body.plan).toBe('free');
    expect(response.body.workspaceId).toBe(WS_ID);
    expect(response.body.credits.creativesUsed).toBe(2);
    expect(response.body.credits.aiCreditsTotal).toBe(50); // free plan AI credit limit
  });

  it('should return billing details for pro plan', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({
      id: WS_ID,
      name: 'Pro Workspace',
      plan: 'pro',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
    });
    mockCreditsFindFirst.mockResolvedValue({ aiCreditsUsed: 850 });

    // Act
    const response = await request(app)
      .get('/api/v1/billing')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.plan).toBe('pro');
    expect(response.body.credits.aiCreditsTotal).toBe(25000); // pro plan AI credit limit
  });

  it('should default missing credit record to zero usage', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, name: 'WS', plan: 'free' });
    mockCreditsFindFirst.mockResolvedValue(undefined);

    // Act
    const response = await request(app)
      .get('/api/v1/billing')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.credits.aiCreditsUsed).toBe(0);
    expect(response.body.credits.aiCreditsTotal).toBe(50);
  });

  it('should return 404 when workspace not found', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue(undefined);

    // Act
    const response = await request(app)
      .get('/api/v1/billing')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert
    expect(response.status).toBe(404);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app).get('/api/v1/billing');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /billing/checkout ───────────────────────────────

describe('POST /api/v1/billing/checkout', () => {
  it('should create a checkout session', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: 'cus_test' });
    mockCreateCheckoutSession.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ priceId: 'price_123' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBe('cs_test');
    expect(response.body.url).toContain('checkout.stripe.com');
  });

  it('should create a Stripe customer when missing', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: null });
    mockCreateStripeCustomer.mockResolvedValue('cus_new');
    mockCreateCheckoutSession.mockResolvedValue({ id: 'cs_new', url: 'https://checkout.stripe.com/new' });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({ priceId: 'price_123' });

    // Assert
    expect(response.status).toBe(200);
    expect(mockCreateStripeCustomer).toHaveBeenCalled();
    expect(response.body.sessionId).toBe('cs_new');
  });

  it('should reject when priceId is missing', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);

    // Act
    const response = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({});

    // Assert
    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/billing/checkout')
      .send({ priceId: 'price_123' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /billing/portal ─────────────────────────────────

describe('POST /api/v1/billing/portal', () => {
  it('should create a customer portal session', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: 'cus_test' });
    mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/portal')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({});

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.url).toContain('billing.stripe.com');
  });

  it('should reject when no Stripe customer exists', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: null });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/portal')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID)
      .send({});

    // Assert
    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/billing/portal')
      .send({});

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /billing/invoices ────────────────────────────────

describe('GET /api/v1/billing/invoices', () => {
  it('should return invoices for a customer', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: 'cus_test' });
    mockRetrieveInvoices.mockResolvedValue({
      invoices: [
        {
          id: 'in_1',
          number: 'INV-001',
          status: 'paid',
          amount_due: 0,
          amount_paid: 2900,
          currency: 'usd',
          created: 1700000000,
          period_start: 1700000000,
          period_end: 1702592000,
          invoice_pdf: 'https://stripe.com/pdf',
          hosted_invoice_url: 'https://stripe.com/inv',
          subscription: 'sub_1',
          description: 'Pro plan',
        },
      ],
      hasMore: false,
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.invoices)).toBe(true);
    expect(response.body.invoices[0].id).toBe('in_1');
    expect(response.body.invoices[0].paid).toBe(true);
    expect(response.body.hasMore).toBe(false);
  });

  it('should return empty list when no Stripe customer', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({ id: WS_ID, stripeCustomerId: null });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.invoices).toEqual([]);
    expect(response.body.hasMore).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app).get('/api/v1/billing/invoices');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});


describe('POST /api/v1/billing/webhook raw body', () => {
  it('passes the raw Buffer body to Stripe signature verification through the mounted app route', async () => {
    const { stripe } = jest.requireMock('../../src/services/stripe') as {
      stripe: { webhooks: { constructEvent: jest.Mock } };
    };
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: 'evt_raw_body',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: { workspace_id: WS_ID } } },
    });

    const payload = JSON.stringify({ id: 'evt_raw_body', type: 'checkout.session.completed' });
    const response = await request(app)
      .post('/api/v1/billing/webhook')
      .set('stripe-signature', 'sig_test')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true, eventId: 'evt_raw_body' });
    expect(Buffer.isBuffer(stripe.webhooks.constructEvent.mock.calls[0][0])).toBe(true);
    expect(stripe.webhooks.constructEvent.mock.calls[0][0].toString('utf8')).toBe(payload);
  });
});

// ─── Suite: Credit Cost Mapping ──────────────────────────────────

describe('credit cost mapping', () => {
  it('should have correct costs for all known features', () => {
    // The CREDIT_COSTS map lives in types and is the source of truth for
    // per-feature AI credit pricing.
    const { CREDIT_COSTS } = require('../../src/types');

    expect(CREDIT_COSTS.morning_brief).toBe(8);
    expect(CREDIT_COSTS.ai_chat_query).toBe(3);
    expect(CREDIT_COSTS.creative_generation).toBe(15);
    expect(CREDIT_COSTS.campaign_analysis).toBe(10);
    expect(CREDIT_COSTS.anomaly_detection).toBe(12);
    expect(CREDIT_COSTS.report_generation).toBe(10);
    expect(CREDIT_COSTS.budget_optimization).toBe(8);
    expect(CREDIT_COSTS.audience_insight).toBe(5);
    expect(CREDIT_COSTS.ab_test_analysis).toBe(10);
    expect(CREDIT_COSTS.mcp_tool_call).toBe(2);
    expect(CREDIT_COSTS.audit_run).toBe(15);
  });
});


describe('GET /api/v1/billing/plans', () => {
  it('returns the v2-compatible success/data envelope consumed by BillingContent', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);

    const response = await request(app)
      .get('/api/v1/billing/plans')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.billingEnabled).toBe(true);
    expect(response.body.data.plans).toEqual([
      { plan: 'growth', priceId: 'price_123', credits: { creatives: 200, impressions: 500000, aiCredits: 5000 } },
    ]);
  });
});
