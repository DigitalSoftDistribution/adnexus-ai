// ============================================
// AdNexus AI — V2 Ads Integration Tests
// ============================================
// GET /api/v2/ads/:id and /performance must not 500 — AdRepository uses
// explicit joins (Drizzle relational `with` is not configured on schema).

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

const mockLimit = jest.fn<() => Promise<unknown[]>>();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockLeftJoin3 = jest.fn(() => ({ where: mockWhere }));
const mockLeftJoin2 = jest.fn(() => ({ leftJoin: mockLeftJoin3 }));
const mockLeftJoin1 = jest.fn(() => ({ leftJoin: mockLeftJoin2 }));
const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin1 }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('../../src/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: jest.fn(),
    query: {},
  },
}));

jest.mock('../../src/db/schema', () => ({
  ads: { id: 'id', adset_id: 'adset_id', workspaceId: 'workspaceId', status: 'status', name: 'name', created_at: 'created_at' },
  adsets: { id: 'id', campaign_id: 'campaign_id' },
  campaigns: { id: 'id', ad_account_id: 'ad_account_id', platform: 'platform' },
  ad_accounts: { id: 'id', workspaceId: 'workspaceId' },
}));

const AD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function adJoinRow() {
  return {
    ad: {
      id: AD_ID,
      workspaceId: UUIDS.workspace1,
      campaign_id: UUIDS.campaign1,
      adset_id: UUIDS.adset1,
      platform: 'meta',
      platformAdId: 'pa-1',
      name: 'Hero Creative',
      status: 'active',
      creative_type: 'image',
      creative_url: 'https://cdn/hero.png',
      creative_text: null,
      spend: '100',
      impressions: 1000,
      clicks: 50,
      ctr: '5',
      conversions: 10,
      cpa: '10',
      roas: '2',
      frequency: '1.5',
      fatigue_score: '20',
      fatigue_status: 'healthy',
      reviewStatus: null,
      policyViolations: null,
      created_at: new Date('2026-06-01'),
      updated_at: new Date('2026-06-02'),
    },
    adset: { id: UUIDS.adset1, workspaceId: UUIDS.workspace1, campaign_id: UUIDS.campaign1, platform: 'meta', platformAdsetId: null, name: 'Adset', status: 'active', created_at: null, updated_at: null },
    campaign: { id: UUIDS.campaign1, workspaceId: UUIDS.workspace1, ad_account_id: UUIDS.metaAccount, platform: 'meta', platformCampaignId: null, name: 'Campaign', status: 'active', objective: null, budget: null, budgetType: null, daily_budget: null, lifetime_budget: null, spend: null, impressions: null, clicks: null, ctr: null, conversions: null, cpa: null, roas: null, frequency: null, cpm: null, cpc: null, start_date: null, end_date: null, platform_data: null, leadFormId: null, created_at: null, updated_at: null },
    adAccount: { id: UUIDS.metaAccount, workspaceId: UUIDS.workspace1, platform: 'meta', platformAccountId: null, name: 'Meta', status: 'active', token_expires_at: null, spendCap: null, disabledReason: null, metadata: null, created_at: null, updated_at: null },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLimit.mockResolvedValue([adJoinRow()]);
});

describe('V2 runtime mount — /api/v2/ads', () => {
  const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);

  describe('auth', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get(`/api/v2/ads/${AD_ID}`);
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('GET /api/v2/ads/:id', () => {
    it('returns 200 with the ad envelope (not 500 INTERNAL_ERROR)', async () => {
      const res = await request(app)
        .get(`/api/v2/ads/${AD_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          id: AD_ID,
          workspaceId: UUIDS.workspace1,
          name: 'Hero Creative',
          fatigueScore: 20,
        },
      });
    });

    it('returns 404 when the ad is not in the workspace', async () => {
      mockLimit.mockResolvedValueOnce([]);
      const res = await request(app)
        .get(`/api/v2/ads/${AD_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    });
  });

  describe('GET /api/v2/ads/:id/performance', () => {
    it('returns 200 with performance metrics (not 500 INTERNAL_ERROR)', async () => {
      const res = await request(app)
        .get(`/api/v2/ads/${AD_ID}/performance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          adId: AD_ID,
          adName: 'Hero Creative',
          spend: 100,
          impressions: 1000,
          clicks: 50,
        },
      });
      expect(res.body.data.dateFrom).toBeDefined();
      expect(res.body.data.dateTo).toBeDefined();
    });
  });
});
