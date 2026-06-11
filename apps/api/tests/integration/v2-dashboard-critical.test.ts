// ============================================
// AdNexus AI — V2 Dashboard-Critical Integration Tests
// ============================================
// Covers dashboard paths flagged in the API route audit (SB-3199):
//   • GET  /api/v2/integrations              — auth + list envelope
//   • POST /api/v2/integrations/accounts/:id/sync — auth + sync job envelope
//   • GET  /api/v2/drafts                      — auth required
//   • POST /api/v2/drafts/:id/approve          — auth required
//   • GET  /api/v2/billing                     — auth required
//   • POST /api/v2/billing/checkout            — checkout validation
//   • GET  /api/v2/agent/recommendations       — auth required
//
// Mirrors v2-campaigns.test.ts: production entrypoint + v2 requireAuth envelope.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { mockWorkspaces, UUIDS } from '../fixtures/data';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

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

jest.mock('../../src/services/stripe', () => ({
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
  createStripeCustomer: jest.fn(),
  retrieveInvoices: jest.fn(),
  getConfiguredPlans: jest.fn(() => [
    { plan: 'growth', priceId: 'price_123', limits: { creatives: 200, impressions: 500000, aiCredits: 5000 } },
  ]),
  getPlanForPrice: jest.fn((priceId: string) => (priceId === 'price_123' ? 'growth' : null)),
  isBillingCheckoutConfigured: jest.fn(() => true),
  isStripeSecretConfigured: jest.fn(() => true),
  handleWebhookEvent: jest.fn().mockResolvedValue(undefined),
  isBillingEnabled: jest.fn().mockReturnValue(true),
  stripe: { webhooks: { constructEvent: jest.fn() } },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const v2Query = (jest.requireMock('../../src/infrastructure/database/connection') as any)
  .query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

const SYNC_JOB_ID = '99999999-9999-9999-9999-999999999998';
const WS_ID = mockWorkspaces.free.id;

function integrationAccountRow() {
  return {
    id: UUIDS.metaAccount,
    platform: 'meta',
    name: 'Meta Ad Account',
    status: 'active',
    platform_account_id: 'act_1234567890',
    metadata: { accountName: 'Meta Main' },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_synced_at: null,
  };
}

function adAccountSyncRow() {
  return {
    id: UUIDS.metaAccount,
    workspace_id: UUIDS.workspace1,
    platform: 'meta',
    platform_account_id: 'act_1234567890',
    name: 'Meta Ad Account',
    status: 'active',
    oauth_token: null,
    refresh_token: null,
    token_expires_at: null,
    is_active: true,
    scopes: [],
    last_synced_at: null,
    spend_cap: null,
    disabled_reason: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

function syncJobRow(status: 'running' | 'completed') {
  const now = new Date().toISOString();
  return {
    id: SYNC_JOB_ID,
    workspace_id: UUIDS.workspace1,
    ad_account_id: UUIDS.metaAccount,
    platform: 'meta',
    status,
    campaigns_synced: 0,
    metrics_synced: 0,
    error_count: 0,
    started_at: now,
    finished_at: status === 'running' ? null : now,
    duration_ms: status === 'running' ? null : 42,
    triggered_by: UUIDS.owner,
    created_at: now,
  };
}

function setupAccountSyncQueryMock() {
  v2Query.mockImplementation(async (sql: string) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    if (normalized.includes('from ad_accounts where id = $1 and workspace_id = $2')) {
      return { rows: [adAccountSyncRow()], rowCount: 1 };
    }
    if (normalized.includes('oauth_token') && normalized.includes('from ad_accounts where id = $1')) {
      return { rows: [{ oauth_token: null, refresh_token: null, token_expires_at: null }], rowCount: 1 };
    }
    if (normalized.includes('from sync_jobs') && normalized.includes("status = 'running'")) {
      return { rows: [], rowCount: 0 };
    }
    if (normalized.includes('insert into sync_jobs')) {
      return { rows: [syncJobRow('running')], rowCount: 1 };
    }
    if (normalized.includes('update sync_jobs')) {
      return { rows: [syncJobRow('completed')], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockWorkspacesFindFirst.mockResolvedValue(undefined);
  mockCreditsFindFirst.mockResolvedValue(undefined);
});

describe('V2 runtime mount — dashboard-critical paths', () => {
  describe('GET /api/v2/integrations', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/integrations');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });

    it('returns 200 with the four-platform integration catalog envelope', async () => {
      v2Query.mockResolvedValueOnce({
        rows: [integrationAccountRow()],
        rowCount: 1,
      });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/integrations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data.find((row: { platform: string }) => row.platform === 'meta')).toMatchObject({
        platform: 'meta',
        connected: true,
        id: UUIDS.metaAccount,
      });
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM ad_accounts WHERE workspace_id = $1'),
        [UUIDS.workspace1],
      );
    });
  });

  describe('POST /api/v2/integrations/accounts/:accountId/sync', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).post(`/api/v2/integrations/accounts/${UUIDS.metaAccount}/sync`);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });

    it('returns 200 with a completed sync job when the account has no live token', async () => {
      setupAccountSyncQueryMock();

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .post(`/api/v2/integrations/accounts/${UUIDS.metaAccount}/sync`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        liveSynced: false,
        job: {
          id: SYNC_JOB_ID,
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          status: 'completed',
        },
      });
    });
  });

  describe('GET /api/v2/drafts', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/drafts');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('POST /api/v2/drafts/:id/approve', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).post(`/api/v2/drafts/${UUIDS.draft1}/approve`);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('GET /api/v2/billing', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/billing');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('POST /api/v2/billing/checkout — validation', () => {
    it('returns 400 when priceId is missing', async () => {
      const token = generateToken(UUIDS.owner, 'owner', WS_ID);
      const res = await request(app)
        .post('/api/v2/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Price ID is required' },
      });
    });

    it('returns 400 for an unknown Stripe price ID', async () => {
      const token = generateToken(UUIDS.owner, 'owner', WS_ID);
      const res = await request(app)
        .post('/api/v2/billing/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ priceId: 'price_unknown' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Unknown Stripe price ID' },
      });
    });
  });

  describe('GET /api/v2/agent/recommendations', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/agent/recommendations');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });
});
