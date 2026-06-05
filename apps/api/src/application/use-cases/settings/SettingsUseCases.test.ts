import { describe, it, expect, vi } from 'vitest';
import { GetWorkspaceSettingsUseCase } from './GetWorkspaceSettingsUseCase';
import { UpdateWorkspaceSettingsUseCase } from './UpdateWorkspaceSettingsUseCase';
import { GetTeamMembersUseCase } from './GetTeamMembersUseCase';
import { RemoveTeamMemberUseCase } from './RemoveTeamMemberUseCase';
import { GetIntegrationsUseCase } from './GetIntegrationsUseCase';
import { GetNotificationPreferencesUseCase } from './GetNotificationPreferencesUseCase';
import { UpdateNotificationPreferencesUseCase } from './UpdateNotificationPreferencesUseCase';
import { GetApiKeysUseCase } from './GetApiKeysUseCase';
import { CreateApiKeyUseCase } from './CreateApiKeyUseCase';
import { RevokeApiKeyUseCase } from './RevokeApiKeyUseCase';
import type { ISettingsRepository, Integration, NotificationPreferences, TeamMember } from '../../../domain/repositories/ISettingsRepository';
import type { ApiKey } from '../../../domain/entities/ApiKey';

const workspaceSettings = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  plan: 'pro',
  branding: { color: 'blue' },
  settings: { timezone: 'UTC' },
};

const member: TeamMember = {
  id: 'mem-1',
  userId: 'u-1',
  name: 'Ada',
  email: 'ada@example.com',
  avatarUrl: null,
  role: 'admin',
  invitedBy: null,
  invitedAt: null,
  joinedAt: '2026-06-01T00:00:00Z',
};

const integration: Integration = {
  id: 'int-1',
  platform: 'meta',
  name: 'Meta',
  status: 'connected',
  accountId: 'acct-1',
  accountName: 'Meta Main',
  connectedAt: '2026-06-01T00:00:00Z',
  lastSyncedAt: null,
};

const preferences: NotificationPreferences = {
  email: { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true },
  inApp: { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true },
  slack: { enabled: false, webhookUrl: null, channel: null },
};

const apiKey: ApiKey = {
  id: 'key-1',
  workspaceId: 'ws-1',
  name: 'Reporting',
  keyHash: 'hash',
  keyPrefix: 'adnx_123',
  scopes: ['read:reports'],
  status: 'active',
  expiresAt: null,
  createdBy: 'u-1',
  revokedBy: null,
  revokedAt: null,
  lastUsedAt: null,
  callsToday: 0,
  callsThisMonth: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<ISettingsRepository> = {}): ISettingsRepository =>
  ({
    getWorkspace: vi.fn().mockResolvedValue(workspaceSettings),
    updateWorkspace: vi.fn().mockResolvedValue(true),
    getProfile: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn().mockResolvedValue(true),
    getTeamMembers: vi.fn().mockResolvedValue([member]),
    addTeamMember: vi.fn().mockResolvedValue(member),
    updateTeamMemberRole: vi.fn().mockResolvedValue(true),
    removeTeamMember: vi.fn().mockResolvedValue(true),
    getIntegrations: vi.fn().mockResolvedValue([integration]),
    getIntegration: vi.fn().mockResolvedValue(integration),
    disconnectIntegration: vi.fn().mockResolvedValue(true),
    getNotificationPreferences: vi.fn().mockResolvedValue(preferences),
    updateNotificationPreferences: vi.fn().mockResolvedValue(true),
    getApiKeys: vi.fn().mockResolvedValue([apiKey]),
    createApiKey: vi.fn().mockResolvedValue({ ...apiKey, fullKey: 'adnx_secret' }),
    revokeApiKey: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as ISettingsRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('workspace settings use-cases', () => {
  it('gets settings for workspace members', async () => {
    const repo = makeRepo();
    const res = await new GetWorkspaceSettingsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(workspaceSettings);
    expect(repo.getWorkspace).toHaveBeenCalledWith('ws-1');
  });

  it('404s when workspace settings are missing', async () => {
    const repo = makeRepo({ getWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetWorkspaceSettingsUseCase(repo).execute({ workspaceId: 'missing', userRole: 'admin' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });

  it('updates settings for admins', async () => {
    const repo = makeRepo();
    const updates = { name: 'Renamed', settings: { timezone: 'Europe/Berlin' } };
    const res = await new UpdateWorkspaceSettingsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'admin', updates });
    expect(res.success).toBe(true);
    expect(repo.updateWorkspace).toHaveBeenCalledWith('ws-1', updates);
  });

  it('denies editors from updating settings', async () => {
    const repo = makeRepo();
    const res = await new UpdateWorkspaceSettingsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'editor', updates: { name: 'Nope' } });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.updateWorkspace).not.toHaveBeenCalled();
  });
});

describe('team settings use-cases', () => {
  it('gets team members for workspace members', async () => {
    const repo = makeRepo();
    const res = await new GetTeamMembersUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual([member]);
    expect(repo.getTeamMembers).toHaveBeenCalledWith('ws-1');
  });

  it('denies unknown roles from reading team members', async () => {
    const repo = makeRepo();
    const res = await new GetTeamMembersUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.getTeamMembers).not.toHaveBeenCalled();
  });

  it('removes a team member for owners/admins', async () => {
    const repo = makeRepo();
    const res = await new RemoveTeamMemberUseCase(repo).execute({ workspaceId: 'ws-1', userId: 'u-2', userRole: 'owner' });
    expect(res.success).toBe(true);
    expect(repo.removeTeamMember).toHaveBeenCalledWith('ws-1', 'u-2');
  });

  it('denies editors from removing team members', async () => {
    const repo = makeRepo();
    const res = await new RemoveTeamMemberUseCase(repo).execute({ workspaceId: 'ws-1', userId: 'u-2', userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.removeTeamMember).not.toHaveBeenCalled();
  });
});

describe('integration and notification settings use-cases', () => {
  it('gets integrations for workspace members', async () => {
    const repo = makeRepo();
    const res = await new GetIntegrationsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual([integration]);
    expect(repo.getIntegrations).toHaveBeenCalledWith('ws-1');
  });

  it('returns default notification preferences when none exist', async () => {
    const repo = makeRepo({ getNotificationPreferences: vi.fn().mockResolvedValue(null) });
    const res = await new GetNotificationPreferencesUseCase(repo).execute({ workspaceId: 'ws-1', userId: 'u-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email.campaignAlerts).toBe(true);
      expect(res.data.slack.enabled).toBe(false);
    }
  });

  it('updates notification preferences for workspace members', async () => {
    const repo = makeRepo();
    const partial = { slack: { enabled: true, webhookUrl: 'https://hooks/slack', channel: '#ads' } };
    const res = await new UpdateNotificationPreferencesUseCase(repo).execute({ workspaceId: 'ws-1', userId: 'u-1', userRole: 'editor', preferences: partial });
    expect(res.success).toBe(true);
    expect(repo.updateNotificationPreferences).toHaveBeenCalledWith('ws-1', 'u-1', partial);
  });
});

describe('API key settings use-cases', () => {
  it('gets API keys for admins', async () => {
    const repo = makeRepo();
    const res = await new GetApiKeysUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'admin' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual([apiKey]);
    expect(repo.getApiKeys).toHaveBeenCalledWith('ws-1');
  });

  it('creates API keys for owners/admins', async () => {
    const repo = makeRepo();
    const res = await new CreateApiKeyUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'owner', name: 'Reporting' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.fullKey).toBe('adnx_secret');
    expect(repo.createApiKey).toHaveBeenCalledWith('ws-1', 'Reporting');
  });

  it('revokes API keys for owners/admins', async () => {
    const repo = makeRepo();
    const res = await new RevokeApiKeyUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'admin', keyId: 'key-1' });
    expect(res.success).toBe(true);
    expect(repo.revokeApiKey).toHaveBeenCalledWith('ws-1', 'key-1');
  });

  it.each([
    ['get', () => new GetApiKeysUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer' })],
    ['create', () => new CreateApiKeyUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'editor', name: 'Reporting' })],
    ['revoke', () => new RevokeApiKeyUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer', keyId: 'key-1' })],
  ])('denies non-admin API key %s access', async (_name, run) => {
    const res = await run();
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});
