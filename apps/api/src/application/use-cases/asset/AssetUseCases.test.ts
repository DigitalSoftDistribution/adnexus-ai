import { describe, it, expect, vi } from 'vitest';
import { ListAssetsUseCase } from './ListAssetsUseCase';
import { GetAssetByIdUseCase } from './GetAssetByIdUseCase';
import { CreateAssetUseCase } from './CreateAssetUseCase';
import { UpdateAssetUseCase } from './UpdateAssetUseCase';
import { DeleteAssetUseCase } from './DeleteAssetUseCase';
import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import type { Asset } from '../../../domain/entities/Asset';

const asset: Asset = {
  id: 'as-1',
  workspaceId: 'ws-1',
  name: 'hero.png',
  originalName: 'hero.png',
  type: 'image',
  mimeType: 'image/png',
  size: 1024,
  url: 'https://cdn/hero.png',
  thumbnailUrl: null,
  status: 'ready',
  metadata: null,
  campaignId: null,
  adId: null,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IAssetRepository> = {}): IAssetRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(asset),
    list: vi.fn().mockResolvedValue({ assets: [asset], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(asset),
    update: vi.fn().mockResolvedValue(asset),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as IAssetRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAssetsUseCase', () => {
  it('lists assets for the workspace', async () => {
    const res = await new ListAssetsUseCase(makeRepo()).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('forwards type/status/campaign/search filters', async () => {
    const repo = makeRepo();
    await new ListAssetsUseCase(repo).execute({
      workspaceId: 'ws-1', type: 'image', status: 'ready', campaignId: 'c-1', search: 'hero', limit: 5,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image', status: 'ready', campaignId: 'c-1', search: 'hero', limit: 5 }),
    );
  });
});

describe('GetAssetByIdUseCase', () => {
  it('returns a workspace-scoped asset', async () => {
    const res = await new GetAssetByIdUseCase(makeRepo()).execute({ assetId: 'as-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
  });

  it('404s when not found in workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAssetByIdUseCase(repo).execute({ assetId: 'x', workspaceId: 'ws-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateAssetUseCase', () => {
  const base = {
    workspaceId: 'ws-1', name: 'hero.png', originalName: 'hero.png', type: 'image',
    mimeType: 'image/png', size: 1024, userId: 'u-1', userRole: 'editor',
  };

  it('creates an asset for an editor with ready status', async () => {
    const repo = makeRepo();
    const res = await new CreateAssetUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'hero.png', status: 'ready', createdBy: 'u-1', url: null }),
    );
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateAssetUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a blank name (400)', async () => {
    const res = await new CreateAssetUseCase(makeRepo()).execute({ ...base, name: '   ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('trims the name', async () => {
    const repo = makeRepo();
    await new CreateAssetUseCase(repo).execute({ ...base, name: '  banner.jpg  ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'banner.jpg' }));
  });
});

describe('UpdateAssetUseCase', () => {
  const base = { assetId: 'as-1', workspaceId: 'ws-1', userRole: 'editor', updates: { name: 'renamed.png' } };

  it('updates for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateAssetUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('as-1', { name: 'renamed.png' });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateAssetUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the asset does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateAssetUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DeleteAssetUseCase', () => {
  const base = { assetId: 'as-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteAssetUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('as-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteAssetUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the asset does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteAssetUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
