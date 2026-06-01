import type { WorkspaceRole } from '../entities/User';

export interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  invitedBy: string | null;
  invitedAt: string | null;
  joinedAt: string;
}

export interface Integration {
  id: string;
  platform: string;
  name: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  accountId: string | null;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

export interface NotificationPreferences {
  email: {
    campaignAlerts: boolean;
    budgetAlerts: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    teamActivity: boolean;
    productUpdates: boolean;
  };
  inApp: {
    campaignAlerts: boolean;
    budgetAlerts: boolean;
    aiRecommendations: boolean;
    teamActivity: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string | null;
    channel: string | null;
  };
}

import type { ApiKey } from '../entities/ApiKey';

export interface ISettingsRepository {
  // Workspace
  getWorkspace(workspaceId: string): Promise<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    branding: Record<string, unknown> | null;
    settings: Record<string, unknown> | null;
  } | null>;
  updateWorkspace(workspaceId: string, updates: {
    name?: string;
    slug?: string;
    branding?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }): Promise<boolean>;

  // Profile
  getProfile(userId: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null>;
  updateProfile(userId: string, updates: {
    name?: string;
    avatarUrl?: string;
  }): Promise<boolean>;

  // Team
  getTeamMembers(workspaceId: string): Promise<TeamMember[]>;
  addTeamMember(workspaceId: string, userId: string, role: WorkspaceRole, invitedBy: string): Promise<TeamMember>;
  updateTeamMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<boolean>;
  removeTeamMember(workspaceId: string, userId: string): Promise<boolean>;

  // Integrations
  getIntegrations(workspaceId: string): Promise<Integration[]>;
  getIntegration(workspaceId: string, platform: string): Promise<Integration | null>;

  // Notifications
  getNotificationPreferences(workspaceId: string, userId: string): Promise<NotificationPreferences | null>;
  updateNotificationPreferences(workspaceId: string, userId: string, prefs: Partial<NotificationPreferences>): Promise<boolean>;

  // API Keys
  getApiKeys(workspaceId: string): Promise<ApiKey[]>;
  createApiKey(workspaceId: string, name: string): Promise<ApiKey & { fullKey: string }>;
  revokeApiKey(workspaceId: string, keyId: string): Promise<boolean>;
}
