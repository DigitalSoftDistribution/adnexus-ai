import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdRepository } from './AdRepository';

const sampleRow = {
  ad: {
    id: 'ad-1',
    workspaceId: 'ws-1',
    campaign_id: 'c-1',
    adset_id: 'aset-1',
    platform: 'meta',
    platformAdId: 'pa-1',
    name: 'Hero Creative',
    status: 'active',
    creative_type: 'image',
    creative_url: 'https://cdn/hero.png',
    creative_text: 'Try it today',
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
  adset: { id: 'aset-1', workspaceId: 'ws-1', campaign_id: 'c-1', platform: 'meta', platformAdsetId: null, name: 'Adset', status: 'active', created_at: null, updated_at: null },
  campaign: { id: 'c-1', workspaceId: 'ws-1', ad_account_id: 'acct-1', platform: 'meta', platformCampaignId: null, name: 'Campaign', status: 'active', objective: null, budget: null, budgetType: null, daily_budget: null, lifetime_budget: null, spend: null, impressions: null, clicks: null, ctr: null, conversions: null, cpa: null, roas: null, frequency: null, cpm: null, cpc: null, start_date: null, end_date: null, platform_data: null, leadFormId: null, created_at: null, updated_at: null },
  adAccount: { id: 'acct-1', workspaceId: 'ws-1', platform: 'meta', platformAccountId: null, name: 'Meta', status: 'active', token_expires_at: null, spendCap: null, disabledReason: null, metadata: null, created_at: null, updated_at: null },
};

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockLeftJoin3 = vi.fn(() => ({ where: mockWhere }));
const mockLeftJoin2 = vi.fn(() => ({ leftJoin: mockLeftJoin3 }));
const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }));
const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('../../db', () => ({
  db: {
    select: () => mockSelect(),
    update: vi.fn(),
  },
}));

vi.mock('../../db/schema', () => ({
  ads: { id: 'id', adset_id: 'adset_id', workspaceId: 'workspaceId', status: 'status', name: 'name', created_at: 'created_at' },
  adsets: { id: 'id', campaign_id: 'campaign_id' },
  campaigns: { id: 'id', ad_account_id: 'ad_account_id' },
  ad_accounts: { id: 'id', workspaceId: 'workspaceId' },
}));

describe('AdRepository', () => {
  const repo = new AdRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([sampleRow]);
  });

  it('findByIdAndWorkspace loads via explicit joins (not relational with)', async () => {
    const ad = await repo.findByIdAndWorkspace('ad-1', 'ws-1');

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockLeftJoin1).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(ad).toMatchObject({
      id: 'ad-1',
      workspaceId: 'ws-1',
      campaignId: 'c-1',
      adsetId: 'aset-1',
      name: 'Hero Creative',
      fatigueScore: 20,
    });
  });

  it('findByIdAndWorkspace returns null when the join yields no row', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const ad = await repo.findByIdAndWorkspace('missing', 'ws-1');
    expect(ad).toBeNull();
  });

  it('getPerformance returns metrics for an existing ad', async () => {
    const perf = await repo.getPerformance('ad-1', '2026-05-01', '2026-05-31');
    expect(perf).toMatchObject({
      adId: 'ad-1',
      adName: 'Hero Creative',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      spend: 100,
      impressions: 1000,
      clicks: 50,
    });
  });
});
