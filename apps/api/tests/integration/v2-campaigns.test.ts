// ============================================
// AdNexus AI — V2 Clean Architecture Integration Tests
// ============================================
// Verifies that the v2 routes are actually SERVED by the production entrypoint
// (apps/api/src/index.ts via mountV2Routes) — the headline P0-1 ship blocker.
//
// Coverage for /api/v2/campaigns*:
//   • auth required (401 without a Bearer token, via v2 requireAuth)
//   • RBAC (403 for a viewer on a mutating POST, via v2 requireRole)
//   • success envelope { success:true, data:{ campaigns, total, ... } }
//   • summary envelope matches what the live Next DashboardContent reads (data.data)
//   • v1 /api/v1/campaigns still works (no regression from the v2 mount)

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

// ─── Mock the v2 infrastructure DB connection ────────────────────
//
// The v2 CampaignRepository reads via `query` from
// src/infrastructure/database/connection (a real pg Pool). tests/setup.ts only
// mocks the v1 `src/db/connection`, so we must mock the v2 connection here.
// Each test drives the SQL result the use-case reads.

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const v2Query = (jest.requireMock('../../src/infrastructure/database/connection') as any)
  .query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — /api/v2/campaigns', () => {
  describe('auth', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/campaigns');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('GET /api/v2/campaigns (list)', () => {
    it('returns 200 with the { success, data:{ campaigns, total } } envelope', async () => {
      // ListCampaignsUseCase -> repo.list(): a COUNT query then a SELECT page.
      v2Query
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // count
        .mockResolvedValueOnce({
          rows: [
            {
              id: UUIDS.campaign1,
              workspace_id: UUIDS.workspace1,
              name: 'Alpha',
              platform: 'meta',
              status: 'active',
              objective: 'sales',
              platform: 'meta',
              spend: 50,
              impressions: 1000,
              clicks: 10,
              ctr: 1,
              conversions: 2,
              start_date: null,
              end_date: null,
            },
          ],
          rowCount: 1,
        });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/campaigns?page=1&limit=20')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('campaigns');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.campaigns)).toBe(true);
    });
  });

  describe('GET /api/v2/campaigns/summary', () => {
    it('returns the summary shape the live DashboardContent reads at data.data', async () => {
      v2Query.mockResolvedValueOnce({
        rows: [
          {
            total_campaigns: 3,
            active_count: 2,
            paused_count: 1,
            total_spend: 150,
            total_impressions: 3000,
            total_clicks: 30,
            total_conversions: 6,
            avg_ctr: 1,
            avg_cpa: 25,
            avg_roas: 3,
            platform_breakdown: { meta: 3 },
            status_breakdown: { active: 2, paused: 1 },
          },
        ],
        rowCount: 1,
      });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/campaigns/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // DashboardContent reads res.json().data and indexes totalCampaigns etc.
      expect(res.body.data).toMatchObject({
        totalCampaigns: 3,
        activeCount: 2,
        pausedCount: 1,
      });
    });
  });

  describe('RBAC — POST /api/v2/campaigns', () => {
    it('returns 403 for a viewer (requireRole owner/admin/editor)', async () => {
      const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
      const res = await request(app)
        .post('/api/v2/campaigns')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', platform: 'meta', objective: 'sales' });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    });
  });
});

// ─── No-regression: v1 campaigns still served after the v2 mount ──

describe('V1 campaigns unregressed', () => {
  it('GET /api/v1/campaigns still requires auth (401 without token)', async () => {
    const res = await request(app).get('/api/v1/campaigns');
    expect(res.status).toBe(401);
  });
});
