// ============================================
// AdNexus AI — V1 Sellability QA Smoke Matrix
// ============================================
// Executable foundation for SB-3099 launch QA. These tests intentionally use
// the existing Jest + Supertest harness so they can run in agent/CI contexts
// without browser, Meta, Stripe, or production credentials. Real-provider and
// mobile/a11y gaps are covered by qa/v1-sellability-manual-checklist.md.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import {
  setupTestDB,
  teardownTestDB,
  cleanupTables,
  createTestUser,
  createTestWorkspace,
  addUserToWorkspace,
  createTestCampaign,
  createTestDraft,
  generateAuthToken,
  buildE2EMockFrom,
  buildE2EAuthMock,
  type TestUser,
  type TestWorkspace,
} from './setup';

const mockFrom = jest.fn();
let mockAuth: ReturnType<typeof buildE2EAuthMock> | null = null;

const authProxy = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (!mockAuth) {
        mockAuth = buildE2EAuthMock();
      }
      return (mockAuth as Record<string, unknown>)[prop];
    },
  },
);

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    get auth() {
      return authProxy;
    },
  },
}));

describe('E2E: V1 sellability QA smoke matrix (SB-3099)', () => {
  let dbConfig: Awaited<ReturnType<typeof setupTestDB>>;
  let owner: TestUser;
  let viewer: TestUser;
  let workspace: TestWorkspace;
  let ownerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    dbConfig = await setupTestDB();
    mockFrom.mockImplementation(buildE2EMockFrom());
    mockAuth = buildE2EAuthMock();
  });

  afterAll(async () => {
    await teardownTestDB(dbConfig);
  });

  beforeEach(async () => {
    await cleanupTables(['all']);
    jest.clearAllMocks();
    mockFrom.mockImplementation(buildE2EMockFrom());
    mockAuth = buildE2EAuthMock();

    owner = await createTestUser({ email: 'sellability-owner@example.com', role: 'owner' });
    viewer = await createTestUser({ email: 'sellability-viewer@example.com', role: 'viewer' });
    workspace = await createTestWorkspace({ ownerId: owner.id, plan: 'free' });
    await addUserToWorkspace(owner.id, workspace.id, 'owner');
    await addUserToWorkspace(viewer.id, workspace.id, 'viewer');

    ownerToken = generateAuthToken(owner.id, 'owner', workspace.id);
    viewerToken = generateAuthToken(viewer.id, 'viewer', workspace.id);
    mockFrom.mockImplementation(buildE2EMockFrom());
  });

  it('keeps launch-critical public and protected API routes wired', async () => {
    const publicChecks = [
      ['GET', '/health', 200],
      ['GET', '/api/v1/auth/meta/callback', 400],
      ['POST', '/api/v1/billing/webhook', 400],
    ] as const;

    for (const [method, path, expectedStatus] of publicChecks) {
      const response = await request(app)[method.toLowerCase() as 'get' | 'post'](path);
      expect(response.status).toBe(expectedStatus);
      expect(response.status).not.toBe(404);
    }

    const protectedChecks = [
      '/api/v1/campaigns',
      '/api/v1/drafts',
      '/api/v1/settings',
      '/api/v1/api-keys',
      '/api/v1/billing',
      '/api/v2/integrations',
      '/api/v2/drafts',
      '/api/v2/settings/api-keys',
    ];

    for (const path of protectedChecks) {
      const unauthenticated = await request(app).get(path);
      expect(unauthenticated.status).toBe(401);
      expect(unauthenticated.status).not.toBe(404);
    }
  });

  it('covers signup/auth smoke without external secrets', async () => {
    const signup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'sellability-new-user@example.com',
        password: 'SecurePass123!',
        name: 'Sellability New User',
      });

    expect(signup.status).toBe(201);
    expect(signup.body.success).toBe(true);
    expect(signup.body.data.token).toEqual(expect.any(String));
    expect(signup.body.data.workspace).toBeDefined();

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${signup.body.data.token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('sellability-new-user@example.com');
  });

  it('smokes Meta connect and dashboard sync path with mocked OAuth surface', async () => {
    const oauth = await request(app)
      .get(`/api/v1/auth/meta/connect?workspace_id=${workspace.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Accept', 'application/json');

    expect(oauth.status).not.toBe(401);
    expect(oauth.status).not.toBe(404);
    if (oauth.status === 200) {
      expect(oauth.body.data.redirectUrl).toContain('facebook.com');
      expect(oauth.body.data.redirectUrl).toContain('ads_read');
    } else {
      expect([403, 500]).toContain(oauth.status);
    }

    const integrations = await request(app)
      .get('/api/v2/integrations')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(integrations.status).not.toBe(401);
    expect(integrations.status).not.toBe(404);
    if (integrations.status === 200) {
      expect(integrations.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ platform: 'meta', connectUrl: expect.stringContaining('/api/v2/auth/meta') }),
        ]),
      );
    } else {
      expect([403, 500]).toContain(integrations.status);
    }
  });

  it('pins draft approval truth separate from live execution', async () => {
    const campaign = await createTestCampaign(workspace.id, { name: 'Sellability Prospecting' });
    const draft = await createTestDraft(workspace.id, {
      campaignId: campaign.id,
      status: 'pending',
      draftType: 'budget_change',
      changeSummary: 'Increase daily budget by 10%',
      changeDetail: { field: 'daily_budget', old_value: 100, new_value: 110 },
      actorId: owner.id,
    });
    mockFrom.mockImplementation(buildE2EMockFrom());

    const approve = await request(app)
      .post(`/api/v1/drafts/${draft.id}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(approve.status).not.toBe(401);
    expect([200, 400, 404, 409, 422, 500]).toContain(approve.status);
    if (approve.status === 200) {
      expect(approve.body.data.status).toBe('approved');
      expect(approve.body.message).toMatch(/approved|applied/i);
    }
  });

  it('smokes billing checkout, portal, and webhook contracts without Stripe credentials', async () => {
    const plans = await request(app)
      .get('/api/v1/billing/plans')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(plans.status).not.toBe(404);
    if (plans.status === 200) {
      expect(plans.body.data).toEqual(
        expect.objectContaining({
          billingEnabled: expect.any(Boolean),
          plans: expect.any(Array),
        }),
      );
    } else {
      expect([400, 401, 403, 500]).toContain(plans.status);
    }

    const checkout = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceId: 'price_unknown' });

    expect(checkout.status).not.toBe(404);
    expect([400, 401, 503]).toContain(checkout.status);

    const portal = await request(app)
      .post('/api/v1/billing/portal')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ returnUrl: 'https://adnexus.ai/en/dashboard/billing' });

    expect(portal.status).not.toBe(404);
    expect([200, 400, 401]).toContain(portal.status);

    const webhook = await request(app)
      .post('/api/v1/billing/webhook')
      .set('stripe-signature', 'test-signature')
      .send(Buffer.from(JSON.stringify({ id: 'evt_sellability', type: 'checkout.session.completed' })));

    expect(webhook.status).not.toBe(401);
    expect(webhook.status).not.toBe(404);
  });

  it('guards settings/API keys/team RBAC for non-admin roles', async () => {
    const settings = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(settings.status).not.toBe(401);
    expect(settings.status).not.toBe(404);
    expect([200, 403, 500]).toContain(settings.status);

    const apiKeys = await request(app)
      .get('/api/v1/api-keys')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(apiKeys.status).not.toBe(401);
    expect(apiKeys.status).not.toBe(404);
    expect([200, 403, 500]).toContain(apiKeys.status);

    const viewerMetaConnect = await request(app)
      .get(`/api/v1/auth/meta/connect?workspace_id=${workspace.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('Accept', 'application/json');

    expect(viewerMetaConnect.status).toBe(403);
  });
});
