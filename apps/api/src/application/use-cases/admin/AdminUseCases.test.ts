import { describe, it, expect, vi } from 'vitest';
import { GetAdminStatsUseCase } from './GetAdminStatsUseCase';
import { ListAllUsersUseCase } from './ListAllUsersUseCase';
import { ListAllWorkspacesUseCase } from './ListAllWorkspacesUseCase';
import { ImpersonateUserUseCase } from './ImpersonateUserUseCase';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { User } from '../../../domain/entities/User';
import type { Workspace } from '../../../domain/entities/Workspace';

const user: User = {
  id: 'u-1',
  email: 'user@example.com',
  name: 'Ada',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const workspace: Workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  plan: 'pro',
  ownerId: 'u-1',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  branding: null,
  settings: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository =>
  ({
    findById: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn().mockResolvedValue(user),
    findByIds: vi.fn().mockResolvedValue([user]),
    list: vi.fn().mockResolvedValue({ users: [user], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockResolvedValue(user),
    delete: vi.fn().mockResolvedValue(true),
    getWorkspaces: vi.fn().mockResolvedValue([]),
    getRoleInWorkspace: vi.fn().mockResolvedValue('admin'),
    ...overrides,
  }) as IUserRepository;

const makeWorkspaceRepo = (overrides: Partial<IWorkspaceRepository> = {}): IWorkspaceRepository =>
  ({
    findById: vi.fn().mockResolvedValue(workspace),
    findBySlug: vi.fn().mockResolvedValue(null),
    findByOwnerId: vi.fn().mockResolvedValue([workspace]),
    list: vi.fn().mockResolvedValue({ workspaces: [workspace], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(workspace),
    update: vi.fn().mockResolvedValue(workspace),
    delete: vi.fn().mockResolvedValue(true),
    getMembers: vi.fn().mockResolvedValue([]),
    getMember: vi.fn().mockResolvedValue(null),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getLimits: vi.fn(),
    checkLimit: vi.fn().mockResolvedValue(true),
    getOnboarding: vi.fn().mockResolvedValue(null),
    setOnboardingStep: vi.fn(),
    completeOnboarding: vi.fn(),
    ...overrides,
  }) as IWorkspaceRepository;

const makeCampaignRepo = (overrides: Partial<ICampaignRepository> = {}): ICampaignRepository =>
  ({ countByWorkspace: vi.fn().mockResolvedValue(0), countByAdAccount: vi.fn().mockResolvedValue(0), ...overrides }) as ICampaignRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('GetAdminStatsUseCase', () => {
  it('returns admin stats for admins', async () => {
    const res = await new GetAdminStatsUseCase(makeWorkspaceRepo(), makeUserRepo(), makeCampaignRepo()).execute({ userRole: 'admin' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalWorkspaces).toBe(0);
      expect(res.data.totalUsers).toBe(0);
      expect(res.data.topWorkspaces).toEqual([]);
    }
  });

  it.each(['owner', 'editor', 'viewer'])('denies %s role', async (userRole) => {
    const res = await new GetAdminStatsUseCase(makeWorkspaceRepo(), makeUserRepo(), makeCampaignRepo()).execute({ userRole });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});

describe('ListAllUsersUseCase', () => {
  it('lists users for admins and forwards filters', async () => {
    const repo = makeUserRepo();
    const res = await new ListAllUsersUseCase(repo).execute({ userRole: 'admin', page: 2, limit: 20, search: 'ada', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.users).toEqual([user]);
    expect(repo.list).toHaveBeenCalledWith({ page: 2, limit: 20, search: 'ada', workspaceId: 'ws-1' });
  });

  it('denies non-admins before querying', async () => {
    const repo = makeUserRepo();
    const res = await new ListAllUsersUseCase(repo).execute({ userRole: 'owner' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.list).not.toHaveBeenCalled();
  });
});

describe('ListAllWorkspacesUseCase', () => {
  it('lists workspaces for admins and forwards filters', async () => {
    const repo = makeWorkspaceRepo();
    const res = await new ListAllWorkspacesUseCase(repo).execute({ userRole: 'admin', page: 3, limit: 10, search: 'acme', status: 'active' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.workspaces).toEqual([workspace]);
    expect(repo.list).toHaveBeenCalledWith({ page: 3, limit: 10, search: 'acme', status: 'active' });
  });

  it('denies non-admins before querying', async () => {
    const repo = makeWorkspaceRepo();
    const res = await new ListAllWorkspacesUseCase(repo).execute({ userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.list).not.toHaveBeenCalled();
  });
});

describe('ImpersonateUserUseCase', () => {
  it('returns the target user for admins', async () => {
    const repo = makeUserRepo();
    const res = await new ImpersonateUserUseCase(repo).execute({ userRole: 'admin', targetUserId: 'u-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(user);
    expect(repo.findById).toHaveBeenCalledWith('u-1');
  });

  it('denies non-admins before lookup', async () => {
    const repo = makeUserRepo();
    const res = await new ImpersonateUserUseCase(repo).execute({ userRole: 'owner', targetUserId: 'u-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('404s when the target user does not exist', async () => {
    const repo = makeUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    const res = await new ImpersonateUserUseCase(repo).execute({ userRole: 'admin', targetUserId: 'missing' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
