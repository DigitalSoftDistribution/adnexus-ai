import { describe, it, expect, vi } from 'vitest';
import { ListAudiencesUseCase } from './ListAudiencesUseCase';
import { GetAudienceByIdUseCase } from './GetAudienceByIdUseCase';
import { CreateAudienceUseCase } from './CreateAudienceUseCase';
import { UpdateAudienceUseCase } from './UpdateAudienceUseCase';
import { DeleteAudienceUseCase } from './DeleteAudienceUseCase';
import { GetAudienceInsightsUseCase } from './GetAudienceInsightsUseCase';
import type { IAudienceRepository, Audience } from '../../../domain/repositories/IAudienceRepository';

const audience: Audience = {
  id: 'aud-1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAudienceId: null,
  name: 'High-value buyers',
  type: 'custom',
  size: 12000,
  targeting: null,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IAudienceRepository> = {}): IAudienceRepository =>
  ({
    list: vi.fn().mockResolvedValue({ audiences: [audience], total: 1, page: 1, limit: 20 }),
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(audience),
    create: vi.fn().mockResolvedValue(audience),
    update: vi.fn().mockResolvedValue(audience),
    delete: vi.fn().mockResolvedValue(true),
    getInsights: vi.fn().mockResolvedValue({ reach: 50000 }),
    ...overrides,
  }) as IAudienceRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAudiencesUseCase', () => {
  it('lists audiences for a viewer', async () => {
    const res = await new ListAudiencesUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListAudiencesUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('forwards filters to the repository', async () => {
    const repo = makeRepo();
    await new ListAudiencesUseCase(repo).execute({
      workspaceId: 'ws-1', userRole: 'admin', platform: 'meta', type: 'custom', search: 'buyers', page: 1, limit: 5,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'meta', type: 'custom', search: 'buyers', limit: 5 }),
    );
  });
});

describe('GetAudienceByIdUseCase', () => {
  it('returns a workspace-scoped audience', async () => {
    const res = await new GetAudienceByIdUseCase(makeRepo()).execute({ audienceId: 'aud-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
  });

  it('404s when not found in workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAudienceByIdUseCase(repo).execute({ audienceId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateAudienceUseCase', () => {
  const base = { workspaceId: 'ws-1', userRole: 'editor', platform: 'meta', name: 'New Aud', type: 'custom' as const };

  it('creates an audience for an editor', async () => {
    const repo = makeRepo();
    const res = await new CreateAudienceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Aud', status: 'active', platformAudienceId: null }),
    );
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateAudienceUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a blank name (400)', async () => {
    const res = await new CreateAudienceUseCase(makeRepo()).execute({ ...base, name: '   ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('trims the name', async () => {
    const repo = makeRepo();
    await new CreateAudienceUseCase(repo).execute({ ...base, name: '  Padded  ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Padded' }));
  });
});

describe('UpdateAudienceUseCase', () => {
  const base = { audienceId: 'aud-1', workspaceId: 'ws-1', userRole: 'editor', updates: { name: 'Renamed' } };

  it('updates for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateAudienceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('aud-1', { name: 'Renamed' });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateAudienceUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the audience does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateAudienceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DeleteAudienceUseCase', () => {
  const base = { audienceId: 'aud-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteAudienceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('aud-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteAudienceUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the audience does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteAudienceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('GetAudienceInsightsUseCase', () => {
  it('returns insights for a viewer', async () => {
    const res = await new GetAudienceInsightsUseCase(makeRepo()).execute({ audienceId: 'aud-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual({ reach: 50000 });
  });

  it('returns an empty object when the repo has no insights', async () => {
    const repo = makeRepo({ getInsights: vi.fn().mockResolvedValue(null) });
    const res = await new GetAudienceInsightsUseCase(repo).execute({ audienceId: 'aud-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual({});
  });

  it('404s when the audience is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAudienceInsightsUseCase(repo).execute({ audienceId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
