// SB-3220 — Deep QA contract fixes: agent sessions alias, integrations accounts flat list.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const v2Query = (jest.requireMock('../../src/infrastructure/database/connection') as any)
  .query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

function accountListRows() {
  return [
    {
      id: UUIDS.metaAccount,
      workspace_id: UUIDS.workspace1,
      platform: 'meta',
      platform_account_id: 'act_1234567890',
      name: 'QA Meta Ads Account',
      status: 'active',
      oauth_token: 'EAAMockAccessToken1234567890',
      refresh_token: null,
      token_expires_at: '2027-06-13T00:00:00.000Z',
      is_active: true,
      scopes: [],
      last_synced_at: null,
      spend_cap: null,
      disabled_reason: null,
      metadata: { mockTraffic: true },
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T00:00:00.000Z',
    },
    {
      id: UUIDS.googleAccount,
      workspace_id: UUIDS.workspace1,
      platform: 'google',
      platform_account_id: '1234567890',
      name: 'QA Google Ads Account',
      status: 'active',
      oauth_token: null,
      refresh_token: null,
      token_expires_at: null,
      is_active: true,
      scopes: [],
      last_synced_at: null,
      spend_cap: null,
      disabled_reason: null,
      metadata: { mockTraffic: true },
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T00:00:00.000Z',
    },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('V2 deep QA contract fixes (SB-3220)', () => {
  const ownerToken = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);

  describe('GET /api/v2/agent/sessions', () => {
    it('returns 200 for workspace owner (alias of conversations)', async () => {
      const res = await request(app)
        .get('/api/v2/agent/sessions?limit=5')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v2/integrations/accounts', () => {
    it('returns 200 with accounts array for workspace owner', async () => {
      v2Query
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: accountListRows(), rowCount: 2 });

      const res = await request(app)
        .get('/api/v2/integrations/accounts')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.accounts)).toBe(true);
      expect(res.body.data.accounts[0]).toMatchObject({
        id: UUIDS.metaAccount,
        platform: 'meta',
        platformAccountId: 'act_1234567890',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v2/integrations/accounts');
      expect(res.status).toBe(401);
    });
  });
});
