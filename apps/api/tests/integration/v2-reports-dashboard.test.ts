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
        total_campaigns: 0,
        active_count: 0,
        paused_count: 0,
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_conversions: 0,
        avg_ctr: 0,
        avg_cpa: 0,
        avg_roas: 0,
        platform_breakdown: {},
        status_breakdown: {},
      }],
      rowCount: 1,
    })
    .mockResolvedValueOnce({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — /api/v2/reports/dashboard', () => {
  it('returns a dashboard summary instead of treating dashboard as a report id', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        totalCampaigns: 0,
        activeCount: 0,
        pausedCount: 0,
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        avgCtr: 0,
        avgCpa: 0,
        avgRoas: 0,
        platformBreakdown: {},
        statusBreakdown: {},
        spendSeries: [],
      },
    });
    expect(v2Query).toHaveBeenCalledWith(
      expect.stringContaining('WITH scoped AS'),
      [UUIDS.workspace1],
    );
  });
});
