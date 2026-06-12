import { describe, it, expect, vi } from 'vitest';
import { ListIntegrationAccountsUseCase } from './ListIntegrationAccountsUseCase';
import { SelectIntegrationAccountUseCase } from './SelectIntegrationAccountUseCase';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';

const account: AdAccount = {
  id: 'acct-1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAccountId: 'act_123',
  name: 'Meta Main',
  status: 'active',
  oauthToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  isActive: true,
  scopes: [],
  lastSyncedAt: null,
  spendCap: null,
  disabledReason: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IAdAccountRepository> = {}): IAdAccountRepository =>
  ({
    list: vi.fn().mockResolvedValue({ adAccounts: [account], total: 1, page: 1, totalPages: 1 }),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(account),
    update: vi.fn().mockResolvedValue({ ...account, isActive: true }),
    ...overrides,
  }) as IAdAccountRepository;

describe('ListIntegrationAccountsUseCase', () => {
  it('lists accounts for a platform', async () => {
    const repo = makeRepo();
    const res = await new ListIntegrationAccountsUseCase(repo).execute({
      workspaceId: 'ws-1', userRole: 'viewer', platform: 'meta',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data[0].platformAccountId).toBe('act_123');
  });
});

describe('SelectIntegrationAccountUseCase', () => {
  it('selects an account for an admin', async () => {
    const repo = makeRepo();
    const res = await new SelectIntegrationAccountUseCase(repo).execute({
      workspaceId: 'ws-1', userRole: 'admin', platform: 'meta', accountId: 'acct-1',
    });
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalled();
  });
});
