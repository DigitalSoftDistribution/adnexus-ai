import { describe, it, expect, vi } from 'vitest';
import { ListAdsUseCase } from './ListAdsUseCase';
import { GetAdByIdUseCase } from './GetAdByIdUseCase';
import { GetAdPerformanceUseCase } from './GetAdPerformanceUseCase';
import { GetAdCreativePerformanceUseCase } from './GetAdCreativePerformanceUseCase';
import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { Ad, AdCreativePerformance, AdPerformance } from '../../../domain/entities/Ad';

const ad: Ad = {
  id: 'ad-1',
  workspaceId: 'ws-1',
  campaignId: 'c-1',
  adsetId: 'aset-1',
  platform: 'meta',
  platformAdId: 'pa-1',
  name: 'Hero Creative',
  status: 'active',
  creativeType: 'image',
  creativeUrl: 'https://cdn/hero.png',
  creativeText: 'Try it today',
  headline: 'Grow faster',
  body: 'Launch better ads',
  callToAction: 'LEARN_MORE',
  landingPageUrl: 'https://example.com',
  spend: 100,
  impressions: 1000,
  clicks: 50,
  ctr: 5,
  conversions: 10,
  cpa: 10,
  roas: 2,
  frequency: 1.5,
  cpm: 100,
  cpc: 2,
  fatigueScore: 20,
  fatigueStatus: 'healthy',
  platformData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const performance: AdPerformance = {
  adId: 'ad-1',
  adName: 'Hero Creative',
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
  spend: 100,
  impressions: 1000,
  clicks: 50,
  ctr: 5,
  conversions: 10,
  cpa: 10,
  roas: 2,
  frequency: 1.5,
  cpm: 100,
  cpc: 2,
};

const creativePerformance: AdCreativePerformance = {
  adId: 'ad-1',
  adName: 'Hero Creative',
  creativeType: 'image',
  creativeUrl: 'https://cdn/hero.png',
  fatigue: {
    score: 20,
    status: 'healthy',
    frequency: 1.5,
    riskLevel: 'low',
    recommendation: 'Keep running',
    estimatedDaysToFatigue: 14,
  },
  ctrTrend: { current: 5, direction: 'stable', estimatedNextWeek: 5 },
  conversionTrend: { current: 10, direction: 'up', estimatedNextWeek: 12 },
  overallHealthScore: 90,
};

const makeRepo = (overrides: Partial<IAdRepository> = {}): IAdRepository =>
  ({
    findById: vi.fn().mockResolvedValue(ad),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(ad),
    list: vi.fn().mockResolvedValue({ ads: [ad], total: 1, page: 1, totalPages: 1 }),
    getPerformance: vi.fn().mockResolvedValue(performance),
    getCreativePerformance: vi.fn().mockResolvedValue(creativePerformance),
    ...overrides,
  }) as IAdRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAdsUseCase', () => {
  const base = { workspaceId: 'ws-1', userRole: 'viewer' };

  it('lists ads for workspace members', async () => {
    const res = await new ListAdsUseCase(makeRepo()).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.ads).toEqual([ad]);
  });

  it('forwards all list filters', async () => {
    const repo = makeRepo();
    await new ListAdsUseCase(repo).execute({
      ...base,
      campaignId: 'c-1',
      adsetId: 'aset-1',
      platform: 'meta',
      status: 'active',
      search: 'hero',
      page: 2,
      limit: 25,
    });
    expect(repo.list).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      campaignId: 'c-1',
      adsetId: 'aset-1',
      platform: 'meta',
      status: 'active',
      search: 'hero',
      page: 2,
      limit: 25,
    });
  });

  it('denies unknown roles and does not query', async () => {
    const repo = makeRepo();
    const res = await new ListAdsUseCase(repo).execute({ ...base, userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.list).not.toHaveBeenCalled();
  });
});

describe('GetAdByIdUseCase', () => {
  const base = { adId: 'ad-1', workspaceId: 'ws-1', userRole: 'viewer' };

  it('returns a workspace-scoped ad', async () => {
    const repo = makeRepo();
    const res = await new GetAdByIdUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.findByIdAndWorkspace).toHaveBeenCalledWith('ad-1', 'ws-1');
  });

  it('404s when the ad is not in the workspace', async () => {
    const res = await new GetAdByIdUseCase(makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) })).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });

  it('denies unknown roles before lookup', async () => {
    const repo = makeRepo();
    const res = await new GetAdByIdUseCase(repo).execute({ ...base, userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
  });
});

describe('GetAdPerformanceUseCase', () => {
  const base = { adId: 'ad-1', workspaceId: 'ws-1', userRole: 'viewer' };

  it('returns performance for a workspace-scoped ad with explicit dates', async () => {
    const repo = makeRepo();
    const res = await new GetAdPerformanceUseCase(repo).execute({ ...base, dateFrom: '2026-05-01', dateTo: '2026-05-31' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(performance);
    expect(repo.getPerformance).toHaveBeenCalledWith('ad-1', '2026-05-01', '2026-05-31');
  });

  it('uses a default trailing date range when dates are omitted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
    const repo = makeRepo();
    const res = await new GetAdPerformanceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.getPerformance).toHaveBeenCalledWith('ad-1', '2026-05-06', '2026-06-05');
    vi.useRealTimers();
  });

  it('does not fetch performance when the ad is missing', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAdPerformanceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.getPerformance).not.toHaveBeenCalled();
  });
});

describe('GetAdCreativePerformanceUseCase', () => {
  const base = { adId: 'ad-1', workspaceId: 'ws-1', userRole: 'viewer' };

  it('returns creative performance for a workspace-scoped ad', async () => {
    const repo = makeRepo();
    const res = await new GetAdCreativePerformanceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(creativePerformance);
    expect(repo.getCreativePerformance).toHaveBeenCalledWith('ad-1');
  });

  it('does not fetch creative performance when the ad is missing', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAdCreativePerformanceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.getCreativePerformance).not.toHaveBeenCalled();
  });
});
