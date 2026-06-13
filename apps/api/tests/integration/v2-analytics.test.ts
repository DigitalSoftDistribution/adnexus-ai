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

beforeEach(() => {
  jest.clearAllMocks();
  v2Query
    .mockResolvedValueOnce({
      rows: [{
        total_campaigns: 2,
        active_count: 1,
        paused_count: 1,
        total_spend: 1200,
        total_impressions: 50000,
        total_clicks: 900,
        total_conversions: 45,
        avg_ctr: 1.8,
        avg_cpa: 26.67,
        avg_roas: 2.4,
        platform_breakdown: { meta: 800, google: 400 },
        status_breakdown: { active: 1, paused: 1 },
      }],
      rowCount: 1,
    })
    .mockResolvedValueOnce({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — /api/v2/analytics/data', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/v2/analytics/data');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('returns campaign summary analytics envelope for authenticated users', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/analytics/data')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('campaign_summary');
    expect(res.body.data.generatedAt).toEqual(expect.any(String));
    expect(res.body.data.summary).toMatchObject({
      totalCampaigns: 2,
      activeCount: 1,
      pausedCount: 1,
      totalSpend: 1200,
      totalImpressions: 50000,
      totalClicks: 900,
      totalConversions: 45,
    });
  });
});
