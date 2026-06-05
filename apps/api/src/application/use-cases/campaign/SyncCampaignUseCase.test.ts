import { describe, it, expect, vi } from 'vitest';
import { SyncCampaignUseCase } from './SyncCampaignUseCase';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { ICampaignHistoryRepository } from '../../../domain/repositories/ICampaignHistoryRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IPlatformSyncService } from '../../ports/IPlatformSyncService';
import type { Campaign } from '../../../domain/entities/Campaign';

const makeCampaign = (overrides: Partial<Campaign> = {}): Campaign =>
  ({
    id: 'camp-1',
    workspaceId: 'ws-1',
    adAccountId: 'acc-1',
    platform: 'meta',
    platformCampaignId: 'fb-123',
    name: 'T',
    status: 'active',
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Campaign;

const makeRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(makeCampaign()),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((_id, updates) => Promise.resolve(makeCampaign(updates))),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  }) as ICampaignRepository;

const makeHistory = (): ICampaignHistoryRepository =>
  ({ create: vi.fn().mockResolvedValue(undefined) }) as unknown as ICampaignHistoryRepository;

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn() }) as unknown as IEventBus;

const base = { campaignId: 'camp-1', workspaceId: 'ws-1', userRole: 'editor', userId: 'u-1' };

describe('SyncCampaignUseCase', () => {
  it('persists live metrics when a platform sync service returns data', async () => {
    const repo = makeRepo();
    const sync: IPlatformSyncService = {
      supports: vi.fn().mockReturnValue(true),
      syncCampaign: vi.fn().mockResolvedValue({
        status: 'paused',
        spend: 100,
        impressions: 1000,
        clicks: 50,
        ctr: 5,
        conversions: 10,
        cpa: 10,
        roas: 3,
        frequency: 1.2,
        cpm: 100,
        cpc: 2,
      }),
      syncAccount: vi.fn().mockResolvedValue(null),
    };

    const res = await new SyncCampaignUseCase(repo, makeHistory(), makeBus(), sync).execute(base);

    expect(res.success).toBe(true);
    expect(sync.syncCampaign).toHaveBeenCalledWith({
      platform: 'meta',
      platformCampaignId: 'fb-123',
      adAccountId: 'acc-1',
    });
    expect(repo.update).toHaveBeenCalledWith(
      'camp-1',
      expect.objectContaining({ spend: 100, impressions: 1000, status: 'paused' }),
    );
  });

  it('falls back to metadata-only sync when no platform service is provided', async () => {
    const repo = makeRepo();
    const res = await new SyncCampaignUseCase(repo, makeHistory(), makeBus()).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('falls back to metadata-only sync when the service returns null', async () => {
    const repo = makeRepo();
    const sync: IPlatformSyncService = {
      supports: vi.fn().mockReturnValue(true),
      syncCampaign: vi.fn().mockResolvedValue(null),
      syncAccount: vi.fn().mockResolvedValue(null),
    };
    const res = await new SyncCampaignUseCase(repo, makeHistory(), makeBus(), sync).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('denies a viewer (403)', async () => {
    const repo = makeRepo();
    const res = await new SyncCampaignUseCase(repo, makeHistory(), makeBus()).execute({
      ...base,
      userRole: 'viewer',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it('returns 404 when the campaign is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new SyncCampaignUseCase(repo, makeHistory(), makeBus()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });
});
