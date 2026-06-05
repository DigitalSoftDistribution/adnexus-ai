import { describe, it, expect, vi } from 'vitest';
import { GetWorkspaceUseCase } from './GetWorkspaceUseCase';
import { InviteMemberUseCase } from './InviteMemberUseCase';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { Workspace } from '../../../domain/entities/Workspace';
import type { User, WorkspaceMember, WorkspaceRole } from '../../../domain/entities/User';

const workspace: Workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  plan: 'pro',
  ownerId: 'owner-1',
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

const user: User = {
  id: 'u-2',
  email: 'member@example.com',
  name: 'Member',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const member: WorkspaceMember = {
  id: 'mem-1',
  userId: user.id,
  workspaceId: workspace.id,
  role: 'editor',
  invitedBy: 'admin-1',
  invitedAt: new Date(),
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeWorkspaceRepo = (overrides: Partial<IWorkspaceRepository> = {}): IWorkspaceRepository =>
  ({
    findById: vi.fn().mockResolvedValue(workspace),
    findBySlug: vi.fn().mockResolvedValue(null),
    findByOwnerId: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue({ workspaces: [workspace], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(workspace),
    update: vi.fn().mockResolvedValue(workspace),
    delete: vi.fn().mockResolvedValue(true),
    getMembers: vi.fn().mockResolvedValue([member]),
    getMember: vi.fn().mockResolvedValue(member),
    addMember: vi.fn().mockResolvedValue(member),
    updateMemberRole: vi.fn().mockResolvedValue(member),
    removeMember: vi.fn().mockResolvedValue(true),
    getLimits: vi.fn().mockResolvedValue({ maxCampaigns: 100, maxAdAccounts: 20, maxUsers: 50, maxAutomations: 50, maxApiKeys: 10 }),
    checkLimit: vi.fn().mockResolvedValue(true),
    getOnboarding: vi.fn().mockResolvedValue(null),
    setOnboardingStep: vi.fn().mockResolvedValue(undefined),
    completeOnboarding: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as IWorkspaceRepository;

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository =>
  ({
    findById: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn().mockResolvedValue(user),
    findByIds: vi.fn().mockResolvedValue([user]),
    list: vi.fn().mockResolvedValue({ users: [user], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockResolvedValue(user),
    delete: vi.fn().mockResolvedValue(true),
    getWorkspaces: vi.fn().mockResolvedValue([member]),
    getRoleInWorkspace: vi.fn().mockResolvedValue('editor'),
    ...overrides,
  }) as IUserRepository;

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as IEventBus;

const makeAudit = (): IAuditLogger =>
  ({ log: vi.fn().mockResolvedValue(undefined), logBatch: vi.fn().mockResolvedValue(undefined) }) as IAuditLogger;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('GetWorkspaceUseCase', () => {
  const base = { workspaceId: 'ws-1', userId: 'u-2', userRole: 'editor' };

  it('returns a workspace for a member', async () => {
    const repo = makeWorkspaceRepo();
    const res = await new GetWorkspaceUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(workspace);
    expect(repo.getMember).toHaveBeenCalledWith('ws-1', 'u-2');
  });

  it('allows an owner role even without a membership row', async () => {
    const repo = makeWorkspaceRepo({ getMember: vi.fn().mockResolvedValue(null) });
    const res = await new GetWorkspaceUseCase(repo).execute({ ...base, userRole: 'owner' });
    expect(res.success).toBe(true);
  });

  it('404s when the workspace does not exist and does not check membership', async () => {
    const repo = makeWorkspaceRepo({ findById: vi.fn().mockResolvedValue(null) });
    const res = await new GetWorkspaceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.getMember).not.toHaveBeenCalled();
  });

  it('denies non-members who are not owners', async () => {
    const repo = makeWorkspaceRepo({ getMember: vi.fn().mockResolvedValue(null) });
    const res = await new GetWorkspaceUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});

describe('InviteMemberUseCase', () => {
  const base = {
    workspaceId: 'ws-1',
    email: 'member@example.com',
    role: 'editor' as WorkspaceRole,
    invitedBy: 'admin-1',
    inviterRole: 'admin',
  };

  it('invites a user, publishes an event, and writes an audit log', async () => {
    const workspaceRepo = makeWorkspaceRepo({ getMember: vi.fn().mockResolvedValue(null) });
    const bus = makeBus();
    const audit = makeAudit();

    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), bus, audit).execute(base);

    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(member);
    expect(workspaceRepo.checkLimit).toHaveBeenCalledWith('ws-1', 'maxUsers');
    expect(workspaceRepo.addMember).toHaveBeenCalledWith('ws-1', 'u-2', 'editor', 'admin-1');
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', invitedUserId: 'u-2', invitedBy: 'admin-1', role: 'editor' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionCategory: 'member_invited', entityType: 'workspace_member', entityId: 'mem-1' }),
    );
  });

  it('denies editors and viewers before repository reads', async () => {
    const workspaceRepo = makeWorkspaceRepo();
    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), makeBus(), makeAudit()).execute({
      ...base,
      inviterRole: 'editor',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(workspaceRepo.checkLimit).not.toHaveBeenCalled();
  });

  it('rejects owner invitations', async () => {
    const workspaceRepo = makeWorkspaceRepo();
    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), makeBus(), makeAudit()).execute({
      ...base,
      role: 'owner',
      inviterRole: 'owner',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(workspaceRepo.checkLimit).not.toHaveBeenCalled();
  });

  it('prevents admins from inviting other admins', async () => {
    const workspaceRepo = makeWorkspaceRepo();
    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), makeBus(), makeAudit()).execute({
      ...base,
      role: 'admin',
      inviterRole: 'admin',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(workspaceRepo.checkLimit).not.toHaveBeenCalled();
  });

  it('rejects when the workspace member limit is reached', async () => {
    const workspaceRepo = makeWorkspaceRepo({
      getMember: vi.fn().mockResolvedValue(null),
      checkLimit: vi.fn().mockResolvedValue(false),
    });
    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), makeBus(), makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(workspaceRepo.addMember).not.toHaveBeenCalled();
  });

  it('rejects when the invitee has not signed up', async () => {
    const workspaceRepo = makeWorkspaceRepo({ getMember: vi.fn().mockResolvedValue(null) });
    const res = await new InviteMemberUseCase(
      workspaceRepo,
      makeUserRepo({ findByEmail: vi.fn().mockResolvedValue(null) }),
      makeBus(),
      makeAudit(),
    ).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(workspaceRepo.addMember).not.toHaveBeenCalled();
  });

  it('409s when the user is already a member', async () => {
    const workspaceRepo = makeWorkspaceRepo({ getMember: vi.fn().mockResolvedValue(member) });
    const res = await new InviteMemberUseCase(workspaceRepo, makeUserRepo(), makeBus(), makeAudit()).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(409);
    expect(workspaceRepo.addMember).not.toHaveBeenCalled();
  });
});
