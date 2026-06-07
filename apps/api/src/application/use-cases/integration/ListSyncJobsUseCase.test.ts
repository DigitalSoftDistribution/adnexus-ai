import { describe, it, expect, vi } from 'vitest';
import { ListSyncJobsUseCase } from './ListSyncJobsUseCase';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { ISyncJobRepository } from '../../../domain/repositories/ISyncJobRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';

const account = {
  id: 'acc-1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAccountId: 'act_123',
  name: 'Acct',
  status: 'active',
  oauthToken: 'real-token',
  refreshToken: 'refresh-token',
  tokenExpiresAt: null,
  isActive: true,
  scopes: [],
  lastSyncedAt: null,
  spendCap: null,
  disabledReason: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
} as AdAccount;

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
  start: vi.fn(),
  finish: vi.fn(),
  listForAccount: vi.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]),
  findRunningForAccount: vi.fn().mockResolvedValue(null),
});

const base = { workspaceId: 'ws-1', adAccountId: 'acc-1', userRole: 'viewer' };

describe('ListSyncJobsUseCase', () => {
  it('returns sync jobs for a workspace account (viewer allowed)', async () => {
    const jobRepo = makeJobRepo();
    const res = await new ListSyncJobsUseCase(makeAccountRepo(), jobRepo).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toHaveLength(2);
    expect(jobRepo.listForAccount).toHaveBeenCalledWith('acc-1', undefined);
  });

  it('returns 404 when the account is not in the workspace', async () => {
    const res = await new ListSyncJobsUseCase(makeAccountRepo(null), makeJobRepo()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListSyncJobsUseCase(makeAccountRepo(), makeJobRepo()).execute({
      ...base,
      userRole: 'stranger',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect((res.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });
});
