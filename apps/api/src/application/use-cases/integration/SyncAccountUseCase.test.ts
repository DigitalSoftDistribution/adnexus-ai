import { describe, it, expect, vi } from 'vitest';
import { SyncAccountUseCase } from './SyncAccountUseCase';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { ISyncJobRepository, SyncJob } from '../../../domain/repositories/ISyncJobRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IPlatformSyncService, SyncAccountResult } from '../../ports/IPlatformSyncService';
import type { AdAccount } from '../../../domain/entities/AdAccount';
import type { Campaign } from '../../../domain/entities/Campaign';

const account: AdAccount = {
  id: 'acc-1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAccountId: 'act_123',
  name: 'Acct',
  status: 'ACTIVE',
  tokenExpiresAt: null,
  spendCap: null,
  disabledReason: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeJob = (status: SyncJob['status'] = 'running'): SyncJob => ({
  id: 'job-1',
  workspaceId: 'ws-1',
  adAccountId: 'acc-1',
  platform: 'meta',
  status,
  campaignsSynced: 0,
  metricsSynced: 0,
  errorCount: 0,
  startedAt: new Date(),
  finishedAt: null,
  durationMs: null,
  triggeredBy: 'u-1',
  createdAt: new Date(),
});

const makeCampaignRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn(),
    findByPlatformCampaignId: vi.fn().mockResolvedValue(null),
    list: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'camp-new' } as Campaign),
    update: vi.fn().mockResolvedValue({ id: 'camp-existing' } as Campaign),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  }) as ICampaignRepository;

const makeAccountRepo = (acc: AdAccount | null = account): IAdAccountRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(acc),
    findByPlatformAccountId: vi.fn(),
    findByWorkspace: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
  }) as IAdAccountRepository;

const makeJobRepo = (): ISyncJobRepository => ({
  start: vi.fn().mockResolvedValue(makeJob()),
  finish: vi.fn().mockImplementation((_id, input) =>
    Promise.resolve({ ...makeJob(input.status), ...input, errorCount: input.errors.length }),
  ),
  listForAccount: vi.fn(),
});

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as IEventBus;

const metrics = {
  spend: 50, impressions: 500, clicks: 25, ctr: 5, conversions: 5,
  cpa: 10, roas: 2, frequency: 1, cpm: 100, cpc: 2,
};

const makeSync = (result: SyncAccountResult | null): IPlatformSyncService => ({
  supports: vi.fn().mockReturnValue(true),
  syncCampaign: vi.fn(),
  syncAccount: vi.fn().mockResolvedValue(result),
});

const base = { workspaceId: 'ws-1', adAccountId: 'acc-1', userRole: 'editor', userId: 'u-1' };

describe('SyncAccountUseCase', () => {
  it('imports campaigns and writes metrics, completing the job', async () => {
    const campaignRepo = makeCampaignRepo();
    const writeMetrics = vi.fn().mockResolvedValue(undefined);
    const stamp = vi.fn().mockResolvedValue(undefined);
    const jobRepo = makeJobRepo();
    const sync = makeSync({
      campaigns: [
        { platformCampaignId: 'fb-1', name: 'C1', status: 'active', metrics },
        { platformCampaignId: 'fb-2', name: 'C2', status: 'paused', metrics },
      ],
      errors: [],
    });

    const res = await new SyncAccountUseCase(
      campaignRepo, makeAccountRepo(), jobRepo, makeBus(), sync, writeMetrics, stamp,
    ).execute(base);

    expect(res.success).toBe(true);
    expect(campaignRepo.create).toHaveBeenCalledTimes(2);
    expect(writeMetrics).toHaveBeenCalledTimes(2);
    expect(stamp).toHaveBeenCalledWith('acc-1');
    if (res.success) {
      expect(res.data.liveSynced).toBe(true);
      expect(res.data.job.status).toBe('completed');
      expect(res.data.job.campaignsSynced).toBe(2);
    }
  });

  it('persists ad sets when a writeAdSets writer is provided', async () => {
    const campaignRepo = makeCampaignRepo();
    const writeAdSets = vi.fn().mockResolvedValue({ adSets: 1, ads: 2 });
    const sync = makeSync({
      campaigns: [
        {
          platformCampaignId: 'fb-1',
          name: 'C1',
          status: 'active',
          metrics,
          adSets: [
            {
              platformAdSetId: 'as-1',
              name: 'AS1',
              status: 'active',
              ads: [
                { platformAdId: 'ad-1', name: 'Ad1', status: 'active' },
                { platformAdId: 'ad-2', name: 'Ad2', status: 'paused' },
              ],
            },
          ],
        },
      ],
      errors: [],
    });

    const res = await new SyncAccountUseCase(
      campaignRepo, makeAccountRepo(), makeJobRepo(), makeBus(), sync,
      vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined), writeAdSets,
    ).execute(base);

    expect(res.success).toBe(true);
    expect(writeAdSets).toHaveBeenCalledWith(
      'ws-1', 'camp-new', 'meta', expect.arrayContaining([expect.objectContaining({ platformAdSetId: 'as-1' })]),
    );
  });

  it('updates existing campaigns instead of creating duplicates', async () => {
    const campaignRepo = makeCampaignRepo({
      findByPlatformCampaignId: vi.fn().mockResolvedValue({ id: 'camp-existing' } as Campaign),
    });
    const sync = makeSync({
      campaigns: [{ platformCampaignId: 'fb-1', name: 'C1', status: 'active', metrics }],
      errors: [],
    });

    const res = await new SyncAccountUseCase(
      campaignRepo, makeAccountRepo(), makeJobRepo(), makeBus(), sync,
      vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined),
    ).execute(base);

    expect(res.success).toBe(true);
    expect(campaignRepo.create).not.toHaveBeenCalled();
    expect(campaignRepo.update).toHaveBeenCalledWith('camp-existing', expect.objectContaining({ spend: 50 }));
  });

  it('records a partial job when some campaigns error', async () => {
    const campaignRepo = makeCampaignRepo({
      create: vi.fn()
        .mockResolvedValueOnce({ id: 'camp-ok' } as Campaign)
        .mockRejectedValueOnce(new Error('db boom')),
    });
    const sync = makeSync({
      campaigns: [
        { platformCampaignId: 'fb-1', name: 'C1', status: 'active', metrics },
        { platformCampaignId: 'fb-2', name: 'C2', status: 'active', metrics },
      ],
      errors: [],
    });

    const res = await new SyncAccountUseCase(
      campaignRepo, makeAccountRepo(), makeJobRepo(), makeBus(), sync,
      vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined),
    ).execute(base);

    expect(res.success).toBe(true);
    if (res.success) expect(res.data.job.status).toBe('partial');
  });

  it('records a no-op completed job when the platform is not syncable', async () => {
    const sync = makeSync(null);
    const res = await new SyncAccountUseCase(
      makeCampaignRepo(), makeAccountRepo(), makeJobRepo(), makeBus(), sync,
      vi.fn(), vi.fn(),
    ).execute(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.liveSynced).toBe(false);
      expect(res.data.job.status).toBe('completed');
    }
  });

  it('denies a viewer (403)', async () => {
    const res = await new SyncAccountUseCase(
      makeCampaignRepo(), makeAccountRepo(), makeJobRepo(), makeBus(), makeSync(null),
      vi.fn(), vi.fn(),
    ).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it('returns 404 when the account is not in the workspace', async () => {
    const res = await new SyncAccountUseCase(
      makeCampaignRepo(), makeAccountRepo(null), makeJobRepo(), makeBus(), makeSync(null),
      vi.fn(), vi.fn(),
    ).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });
});
