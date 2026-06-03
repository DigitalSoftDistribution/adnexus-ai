import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cache is consulted before the repo; mock it to a clean miss so the repo runs.
vi.mock('../../../services/cache-service', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
}));

import { ListCampaignsUseCase } from './ListCampaignsUseCase';
import type { ICampaignRepository, CampaignListResult } from '../../../domain/repositories/ICampaignRepository';

const listResult: CampaignListResult = {
  campaigns: [{ id: 'c1' } as any],
  total: 1,
  page: 1,
  totalPages: 1,
};

const makeRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn(),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn().mockResolvedValue(listResult),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  }) as ICampaignRepository;

describe('ListCampaignsUseCase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the paginated list for a viewer (read allowed)', async () => {
    const repo = makeRepo();
    const res = await new ListCampaignsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.total).toBe(1);
      expect(res.data.campaigns).toHaveLength(1);
    }
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-1' }));
  });

  it('forwards filters (status/platform/search/paging) to the repo', async () => {
    const repo = makeRepo();
    await new ListCampaignsUseCase(repo).execute({
      workspaceId: 'ws-1', userRole: 'admin', status: 'active', platform: 'meta', search: 'x', page: 2, limit: 10,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', platform: 'meta', search: 'x', page: 2, limit: 10 }),
    );
  });

  it('denies an unknown role (403)', async () => {
    const repo = makeRepo();
    const res = await new ListCampaignsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'stranger' });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.list).not.toHaveBeenCalled();
  });
});
