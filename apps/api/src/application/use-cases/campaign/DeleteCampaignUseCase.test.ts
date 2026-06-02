import { describe, it, expect, vi } from 'vitest';
import { DeleteCampaignUseCase } from './DeleteCampaignUseCase';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';

const makeCampaign = (): Campaign =>
  ({
    id: 'camp-1',
    workspaceId: 'ws-1',
    name: 'Test',
    platform: 'meta',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as Campaign;

const makeRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(makeCampaign()),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  }) as ICampaignRepository;

const baseInput = { campaignId: 'camp-1', workspaceId: 'ws-1', userRole: 'admin' };

describe('DeleteCampaignUseCase', () => {
  it('deletes a campaign for an admin', async () => {
    const repo = makeRepo();
    const result = await new DeleteCampaignUseCase(repo).execute(baseInput);
    expect(result.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('camp-1');
  });

  it('denies an editor (only owner/admin can delete)', async () => {
    const repo = makeRepo();
    const result = await new DeleteCampaignUseCase(repo).execute({ ...baseInput, userRole: 'editor' });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as { statusCode: number }).statusCode).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('denies a viewer (403)', async () => {
    const repo = makeRepo();
    const result = await new DeleteCampaignUseCase(repo).execute({ ...baseInput, userRole: 'viewer' });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as { statusCode: number }).statusCode).toBe(403);
  });

  it('returns 404 when the campaign does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const result = await new DeleteCampaignUseCase(repo).execute(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as { statusCode: number }).statusCode).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
