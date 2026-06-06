import { describe, it, expect, vi } from 'vitest';
import { ListAdAccountsUseCase } from './ListAdAccountsUseCase';
import { ConnectAdAccountUseCase } from './ConnectAdAccountUseCase';
import { DisconnectAdAccountUseCase } from './DisconnectAdAccountUseCase';
import { SyncAdAccountUseCase } from './SyncAdAccountUseCase';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { AdAccount } from '../../../domain/entities/AdAccount';

const account: AdAccount = {
  id: 'acct-1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAccountId: 'act_123',
  name: 'Meta Main',
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
};

const makeAdAccountRepo = (overrides: Partial<IAdAccountRepository> = {}): IAdAccountRepository =>
  ({
    findById: vi.fn().mockResolvedValue(account),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(account),
    findByPlatformAccountId: vi.fn().mockResolvedValue(null),
    findByWorkspace: vi.fn().mockResolvedValue([account]),
    list: vi.fn().mockResolvedValue({ adAccounts: [account], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(account),
    update: vi.fn().mockResolvedValue(account),
    delete: vi.fn().mockResolvedValue(true),
    countByWorkspace: vi.fn().mockResolvedValue(1),
    ...overrides,
  }) as IAdAccountRepository;

const makeWorkspaceRepo = (overrides: Partial<IWorkspaceRepository> = {}): IWorkspaceRepository =>
  ({ checkLimit: vi.fn().mockResolvedValue(true), ...overrides }) as IWorkspaceRepository;

const makeCampaignRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({ countByAdAccount: vi.fn().mockResolvedValue(0), ...overrides }) as ICampaignRepository;

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as IEventBus;

const makeAudit = (): IAuditLogger =>
  ({ log: vi.fn().mockResolvedValue(undefined), logBatch: vi.fn().mockResolvedValue(undefined) }) as IAuditLogger;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAdAccountsUseCase', () => {
  const base = { workspaceId: 'ws-1', userRole: 'viewer' };

  it('lists ad accounts for workspace members', async () => {
    const res = await new ListAdAccountsUseCase(makeAdAccountRepo()).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.adAccounts).toEqual([account]);
  });

  it('forwards platform/status/search/pagination filters', async () => {
    const repo = makeAdAccountRepo();
    await new ListAdAccountsUseCase(repo).execute({
      ...base,
      platform: ['meta', 'google'],
      status: ['active', 'error'],
      search: 'main',
      page: 2,
      limit: 10,
    });
    expect(repo.list).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      platform: ['meta', 'google'],
      status: ['active', 'error'],
      search: 'main',
      page: 2,
      limit: 10,
    });
  });

  it('denies unknown roles before querying', async () => {
    const repo = makeAdAccountRepo();
    const res = await new ListAdAccountsUseCase(repo).execute({ ...base, userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.list).not.toHaveBeenCalled();
  });
});

describe('ConnectAdAccountUseCase', () => {
  const base = {
    workspaceId: 'ws-1',
    platform: 'meta' as const,
    platformAccountId: 'act_123',
    name: '  Meta Main  ',
    oauthToken: 'real-token',
    userId: 'u-1',
    userRole: 'admin',
  };

  it('connects an account, publishes an event, and writes an audit log', async () => {
    const repo = makeAdAccountRepo();
    const bus = makeBus();
    const audit = makeAudit();
    const res = await new ConnectAdAccountUseCase(repo, makeWorkspaceRepo(), bus, audit).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meta Main', status: 'active', oauthToken: 'real-token', metadata: {} }));
    expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({ adAccountId: 'acct-1', workspaceId: 'ws-1', platform: 'meta' }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionCategory: 'ad_account_connected', entityId: 'acct-1' }));
  });



  it('rejects placeholder connect attempts without a real OAuth token', async () => {
    const repo = makeAdAccountRepo();
    const res = await new ConnectAdAccountUseCase(repo, makeWorkspaceRepo(), makeBus(), makeAudit()).execute({
      ...base,
      oauthToken: '   ',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('denies editors before duplicate or limit checks', async () => {
    const repo = makeAdAccountRepo();
    const workspaceRepo = makeWorkspaceRepo();
    const res = await new ConnectAdAccountUseCase(repo, workspaceRepo, makeBus(), makeAudit()).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByPlatformAccountId).not.toHaveBeenCalled();
    expect(workspaceRepo.checkLimit).not.toHaveBeenCalled();
  });

  it('rejects duplicate platform accounts', async () => {
    const repo = makeAdAccountRepo({ findByPlatformAccountId: vi.fn().mockResolvedValue(account) });
    const res = await new ConnectAdAccountUseCase(repo, makeWorkspaceRepo(), makeBus(), makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects when the workspace ad-account limit is reached', async () => {
    const repo = makeAdAccountRepo();
    const res = await new ConnectAdAccountUseCase(
      repo,
      makeWorkspaceRepo({ checkLimit: vi.fn().mockResolvedValue(false) }),
      makeBus(),
      makeAudit(),
    ).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('DisconnectAdAccountUseCase', () => {
  const base = { adAccountId: 'acct-1', workspaceId: 'ws-1', userId: 'u-1', userRole: 'admin', reason: 'Rotated credentials' };

  it('disconnects an active account and logs active campaigns at disconnect', async () => {
    const repo = makeAdAccountRepo();
    const campaignRepo = makeCampaignRepo({ countByAdAccount: vi.fn().mockResolvedValue(3) });
    const bus = makeBus();
    const audit = makeAudit();
    const res = await new DisconnectAdAccountUseCase(repo, campaignRepo, bus, audit).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('acct-1', { status: 'disconnected', oauthToken: null, refreshToken: null, isActive: false, disabledReason: 'Rotated credentials' });
    expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({ adAccountId: 'acct-1', workspaceId: 'ws-1', platform: 'meta', reason: 'Rotated credentials' }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: { reason: 'Rotated credentials', activeCampaignsAtDisconnect: 3 } }));
  });

  it('denies editors before lookup', async () => {
    const repo = makeAdAccountRepo();
    const res = await new DisconnectAdAccountUseCase(repo, makeCampaignRepo(), makeBus(), makeAudit()).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not disconnect missing accounts', async () => {
    const repo = makeAdAccountRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DisconnectAdAccountUseCase(repo, makeCampaignRepo(), makeBus(), makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not disconnect an already disconnected account', async () => {
    const repo = makeAdAccountRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue({ ...account, status: 'disconnected' }) });
    const res = await new DisconnectAdAccountUseCase(repo, makeCampaignRepo(), makeBus(), makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('SyncAdAccountUseCase', () => {
  const base = { adAccountId: 'acct-1', workspaceId: 'ws-1', userId: 'u-1', userRole: 'editor' };

  it('syncs an active account and records an audit log', async () => {
    const repo = makeAdAccountRepo();
    const audit = makeAudit();
    const res = await new SyncAdAccountUseCase(repo, audit).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('acct-1', { metadata: expect.objectContaining({ lastSyncAt: expect.any(String) }), lastSyncedAt: expect.any(Date) });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionCategory: 'ad_account_synced', entityId: 'acct-1' }));
  });

  it('denies viewers before lookup', async () => {
    const repo = makeAdAccountRepo();
    const res = await new SyncAdAccountUseCase(repo, makeAudit()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
  });

  it('404s when the account is not in the workspace', async () => {
    const repo = makeAdAccountRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new SyncAdAccountUseCase(repo, makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not sync disconnected accounts', async () => {
    const repo = makeAdAccountRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue({ ...account, status: 'disconnected' }) });
    const res = await new SyncAdAccountUseCase(repo, makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
