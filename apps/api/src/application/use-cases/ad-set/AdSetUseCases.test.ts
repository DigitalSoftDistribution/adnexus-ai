import { describe, it, expect, vi } from 'vitest';
import { ListAdSetsUseCase } from './ListAdSetsUseCase';
import { GetAdSetByIdUseCase } from './GetAdSetByIdUseCase';
import { CreateAdSetUseCase } from './CreateAdSetUseCase';
import { UpdateAdSetUseCase } from './UpdateAdSetUseCase';
import { DeleteAdSetUseCase } from './DeleteAdSetUseCase';
import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import type { AdSet } from '../../../domain/entities/AdSet';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';

const adSet: AdSet = {
  id: 'aset-1',
  campaignId: 'c-1',
  platformAdSetId: null,
  name: 'Prospecting US',
  status: 'active',
  budget: 100,
  budgetType: 'daily',
  bidStrategy: 'lowest_cost',
  bidAmount: null,
  targeting: null,
  spend: 0,
  impressions: 0,
  clicks: 0,
  ctr: null,
  conversions: 0,
  cpa: null,
  roas: null,
  cpm: null,
  cpc: null,
  frequency: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IAdSetRepository> = {}): IAdSetRepository =>
  ({
    findById: vi.fn().mockResolvedValue(adSet),
    findByIdAndCampaign: vi.fn().mockResolvedValue(adSet),
    list: vi.fn().mockResolvedValue({ adSets: [adSet], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(adSet),
    update: vi.fn().mockResolvedValue(adSet),
    delete: vi.fn().mockResolvedValue(true),
    countByCampaign: vi.fn().mockResolvedValue(1),
    ...overrides,
  }) as IAdSetRepository;

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as IEventBus;

const makeAudit = (): IAuditLogger =>
  ({ log: vi.fn().mockResolvedValue(undefined), logBatch: vi.fn().mockResolvedValue(undefined) }) as IAuditLogger;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAdSetsUseCase', () => {
  it('lists ad sets for a campaign', async () => {
    const res = await new ListAdSetsUseCase(makeRepo()).execute({ campaignId: 'c-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('forwards status/search/sort filters', async () => {
    const repo = makeRepo();
    await new ListAdSetsUseCase(repo).execute({
      campaignId: 'c-1', status: 'active', search: 'US', sortBy: 'spend', sortOrder: 'desc', limit: 10,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'c-1', status: 'active', search: 'US', sortBy: 'spend', sortOrder: 'desc', limit: 10 }),
    );
  });
});

describe('GetAdSetByIdUseCase', () => {
  it('scopes by campaign when campaignId is provided', async () => {
    const repo = makeRepo();
    const res = await new GetAdSetByIdUseCase(repo).execute({ adSetId: 'aset-1', campaignId: 'c-1' });
    expect(res.success).toBe(true);
    expect(repo.findByIdAndCampaign).toHaveBeenCalledWith('aset-1', 'c-1');
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('falls back to findById when no campaignId', async () => {
    const repo = makeRepo();
    const res = await new GetAdSetByIdUseCase(repo).execute({ adSetId: 'aset-1' });
    expect(res.success).toBe(true);
    expect(repo.findById).toHaveBeenCalledWith('aset-1');
  });

  it('404s when not found', async () => {
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(null),
      findByIdAndCampaign: vi.fn().mockResolvedValue(null),
    });
    const res = await new GetAdSetByIdUseCase(repo).execute({ adSetId: 'x', campaignId: 'c-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateAdSetUseCase', () => {
  const base = { campaignId: 'c-1', name: 'Prospecting US', userId: 'u-1', userRole: 'editor' };

  it('creates an ad set and writes an audit log for an editor', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const res = await new CreateAdSetUseCase(repo, makeBus(), audit).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'c-1', name: 'Prospecting US', spend: 0, platformAdSetId: null }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionCategory: 'ad_set_created', entityType: 'ad_set', campaignId: 'c-1' }),
    );
  });

  it('defaults status to draft when not provided', async () => {
    const repo = makeRepo();
    await new CreateAdSetUseCase(repo, makeBus(), makeAudit()).execute(base);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('denies a viewer (403) and writes no audit log', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const res = await new CreateAdSetUseCase(repo, makeBus(), audit).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe('UpdateAdSetUseCase', () => {
  const base = { adSetId: 'aset-1', userRole: 'editor', updates: { name: 'Renamed' } };

  it('updates for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateAdSetUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('aset-1', { name: 'Renamed' });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateAdSetUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when update finds nothing', async () => {
    const repo = makeRepo({ update: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateAdSetUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('DeleteAdSetUseCase', () => {
  const base = { adSetId: 'aset-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteAdSetUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('aset-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteAdSetUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when delete finds nothing', async () => {
    const repo = makeRepo({ delete: vi.fn().mockResolvedValue(false) });
    const res = await new DeleteAdSetUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
