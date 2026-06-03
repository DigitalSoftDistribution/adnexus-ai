import { describe, it, expect, vi } from 'vitest';
import { PauseCampaignUseCase } from './PauseCampaignUseCase';
import { ActivateCampaignUseCase } from './ActivateCampaignUseCase';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';

const makeCampaign = (status = 'active'): Campaign =>
  ({ id: 'camp-1', workspaceId: 'ws-1', name: 'T', platform: 'meta', status, createdAt: new Date(), updatedAt: new Date() }) as Campaign;

const makeRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(makeCampaign()),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(makeCampaign('paused')),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  }) as ICampaignRepository;

const base = { campaignId: 'camp-1', workspaceId: 'ws-1', userRole: 'editor' };

describe('PauseCampaignUseCase', () => {
  it('pauses a campaign for an editor', async () => {
    const repo = makeRepo();
    const res = await new PauseCampaignUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('camp-1', { status: 'paused' });
  });

  it('denies a viewer (403)', async () => {
    const repo = makeRepo();
    const res = await new PauseCampaignUseCase(repo).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the campaign is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new PauseCampaignUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });
});

describe('ActivateCampaignUseCase', () => {
  it('activates a campaign for an admin', async () => {
    const repo = makeRepo({ update: vi.fn().mockResolvedValue(makeCampaign('active')) });
    const res = await new ActivateCampaignUseCase(repo).execute({ ...base, userRole: 'admin' });
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('camp-1', { status: 'active' });
  });

  it('denies a viewer (403)', async () => {
    const repo = makeRepo();
    const res = await new ActivateCampaignUseCase(repo).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });
});
