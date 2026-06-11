import { describe, it, expect, vi } from 'vitest';
import { GetProfileUseCase } from './GetProfileUseCase';
import { UpdateProfileUseCase } from './UpdateProfileUseCase';
import { ConnectPlatformUseCase } from '../integration/ConnectPlatformUseCase';
import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';

const profile = {
  id: 'u-1',
  email: 'ada@example.com',
  name: 'Ada',
  avatarUrl: null,
};

const makeRepo = (overrides: Partial<ISettingsRepository> = {}): ISettingsRepository =>
  ({
    getProfile: vi.fn().mockResolvedValue(profile),
    updateProfile: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as ISettingsRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('GetProfileUseCase', () => {
  it('returns profile for a viewer', async () => {
    const res = await new GetProfileUseCase(makeRepo()).execute({ userId: 'u-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe('ada@example.com');
  });
});

describe('UpdateProfileUseCase', () => {
  it('updates profile for a viewer', async () => {
    const repo = makeRepo();
    const res = await new UpdateProfileUseCase(repo).execute({
      userId: 'u-1', userRole: 'viewer', name: 'Ada Lovelace',
    });
    expect(res.success).toBe(true);
    expect(repo.updateProfile).toHaveBeenCalledWith('u-1', { name: 'Ada Lovelace', avatarUrl: undefined });
  });

  it('rejects blank name (400)', async () => {
    const res = await new UpdateProfileUseCase(makeRepo()).execute({
      userId: 'u-1', userRole: 'viewer', name: '   ',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });
});

describe('ConnectPlatformUseCase', () => {
  it('returns connect URL for admin', async () => {
    const res = await new ConnectPlatformUseCase().execute({
      workspaceId: 'ws-1', userRole: 'admin', platform: 'meta',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.connectUrl).toContain('/api/v1/auth/meta/connect');
      expect(res.data.connectUrl).toContain('workspace_id=ws-1');
    }
  });

  it('denies viewer (403)', async () => {
    const res = await new ConnectPlatformUseCase().execute({
      workspaceId: 'ws-1', userRole: 'viewer', platform: 'meta',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});
