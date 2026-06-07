import type { ISettingsRepository, TeamMember, Integration, NotificationPreferences } from '../../domain/repositories/ISettingsRepository';
import type { ApiKey } from '../../domain/entities/ApiKey';
import type { WorkspaceRole } from '../../domain/entities/User';
import { PLAN_LIMITS, type WorkspaceLimits, type PlanTier } from '../../domain/entities/Workspace';
import { query } from '../database/connection';
import { createHash, randomBytes } from 'crypto';

export class SettingsRepository implements ISettingsRepository {
  // Workspace
  async getWorkspace(workspaceId: string) {
    const { rows } = await query<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      branding: Record<string, unknown> | null;
      settings: Record<string, unknown> | null;
    }>(
      `SELECT id, name, slug, plan, branding, settings FROM workspaces WHERE id = $1`,
      [workspaceId],
    );
    return rows[0] ?? null;
  }

  async updateWorkspace(workspaceId: string, updates: {
    name?: string;
    slug?: string;
    branding?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }) {
    const setClauses: string[] = [];
    const params: unknown[] = [workspaceId];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${++idx}`);
      params.push(updates.name);
    }
    if (updates.slug !== undefined) {
      setClauses.push(`slug = $${++idx}`);
      params.push(updates.slug);
    }
    if (updates.branding !== undefined) {
      setClauses.push(`branding = $${++idx}`);
      params.push(JSON.stringify(updates.branding));
    }
    if (updates.settings !== undefined) {
      setClauses.push(`settings = $${++idx}`);
      params.push(JSON.stringify(updates.settings));
    }

    if (setClauses.length === 0) return true;

    const { rowCount } = await query(
      `UPDATE workspaces SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1`,
      params,
    );
    return (rowCount ?? 0) > 0;
  }

  // Profile
  async getProfile(userId: string) {
    const { rows } = await query<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT id, email, name, avatar_url FROM users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
    };
  }

  async updateProfile(userId: string, updates: { name?: string; avatarUrl?: string }) {
    const setClauses: string[] = [];
    const params: unknown[] = [userId];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${++idx}`);
      params.push(updates.name);
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${++idx}`);
      params.push(updates.avatarUrl);
    }

    if (setClauses.length === 0) return true;

    const { rowCount } = await query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1`,
      params,
    );
    return (rowCount ?? 0) > 0;
  }

  // Team
  async getTeamMembers(workspaceId: string): Promise<TeamMember[]> {
    const { rows } = await query<{
      id: string;
      user_id: string;
      name: string | null;
      email: string;
      avatar_url: string | null;
      role: WorkspaceRole;
      invited_by: string | null;
      invited_at: string | null;
      joined_at: string;
    }>(
      `SELECT wm.id, wm.user_id, u.name, u.email, u.avatar_url, wm.role, wm.invited_by, wm.invited_at, wm.joined_at
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at DESC`,
      [workspaceId],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      avatarUrl: r.avatar_url,
      role: r.role,
      invitedBy: r.invited_by,
      invitedAt: r.invited_at,
      joinedAt: r.joined_at,
    }));
  }

  async findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    const { rows } = await query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findTeamMember(workspaceId: string, userId: string): Promise<TeamMember | null> {
    const members = await this.getTeamMembers(workspaceId);
    return members.find((member) => member.userId === userId) ?? null;
  }

  async canAddTeamMember(workspaceId: string): Promise<boolean> {
    const { rows } = await query<{ plan: PlanTier }>(
      `SELECT plan FROM workspaces WHERE id = $1`,
      [workspaceId],
    );
    const plan = rows[0]?.plan ?? 'free';
    const maxUsers = (PLAN_LIMITS[plan] as WorkspaceLimits).maxUsers;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM workspace_members WHERE workspace_id = $1`,
      [workspaceId],
    );
    const current = parseInt(countRows[0]?.count ?? '0', 10);

    return current < maxUsers;
  }

  async addTeamMember(workspaceId: string, userId: string, role: WorkspaceRole, invitedBy: string): Promise<TeamMember> {
    const { rows } = await query<{
      id: string;
      user_id: string;
      name: string | null;
      email: string;
      avatar_url: string | null;
      role: WorkspaceRole;
      invited_by: string | null;
      invited_at: string | null;
      joined_at: string;
    }>(
      `INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, invited_at, joined_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, user_id, role, invited_by, invited_at, joined_at`,
      [workspaceId, userId, role, invitedBy],
    );
    const member = rows[0];

    const { rows: userRows } = await query<{ name: string | null; email: string; avatar_url: string | null }>(
      `SELECT name, email, avatar_url FROM users WHERE id = $1`,
      [userId],
    );
    const user = userRows[0];

    return {
      id: member.id,
      userId: member.user_id,
      name: user?.name ?? null,
      email: user?.email ?? '',
      avatarUrl: user?.avatar_url ?? null,
      role: member.role,
      invitedBy: member.invited_by,
      invitedAt: member.invited_at,
      joinedAt: member.joined_at,
    };
  }

  async updateTeamMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE workspace_members SET role = $3, updated_at = NOW()
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId, role],
    );
    return (rowCount ?? 0) > 0;
  }

  async removeTeamMember(workspaceId: string, userId: string): Promise<boolean> {
    const { rowCount } = await query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  // Integrations
  async getIntegrations(workspaceId: string): Promise<Integration[]> {
    const { rows } = await query<{
      id: string;
      platform: string;
      name: string;
      status: string;
      platform_account_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string | null;
      last_synced_at: string | null;
    }>(
      `SELECT id, platform, name, status, platform_account_id, metadata, created_at, updated_at, last_synced_at
       FROM ad_accounts WHERE workspace_id = $1`,
      [workspaceId],
    );

    return rows.map((r) => ({
      id: r.id,
      platform: r.platform,
      name: r.name,
      status: r.status as Integration['status'],
      accountId: r.platform_account_id,
      accountName: (r.metadata as Record<string, string> | null)?.accountName ?? r.name,
      connectedAt: r.created_at,
      // Real last-sync time; falls back to null (not updated_at) so unrelated
      // row updates like token refresh don't masquerade as a sync.
      lastSyncedAt: r.last_synced_at,
    }));
  }

  async getIntegration(workspaceId: string, platform: string): Promise<Integration | null> {
    const { rows } = await query<{
      id: string;
      platform: string;
      name: string;
      status: string;
      platform_account_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string | null;
      last_synced_at: string | null;
    }>(
      `SELECT id, platform, name, status, platform_account_id, metadata, created_at, updated_at, last_synced_at
       FROM ad_accounts WHERE workspace_id = $1 AND platform = $2 LIMIT 1`,
      [workspaceId, platform],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      platform: r.platform,
      name: r.name,
      status: r.status as Integration['status'],
      accountId: r.platform_account_id,
      accountName: (r.metadata as Record<string, string> | null)?.accountName ?? r.name,
      connectedAt: r.created_at,
      lastSyncedAt: r.last_synced_at,
    };
  }

  async disconnectIntegration(workspaceId: string, platform: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE ad_accounts
       SET status = 'disconnected', is_active = false, oauth_token = NULL,
           refresh_token = NULL, updated_at = NOW()
       WHERE workspace_id = $1 AND platform = $2`,
      [workspaceId, platform],
    );
    return (rowCount ?? 0) > 0;
  }

  // Notifications
  async getNotificationPreferences(workspaceId: string, userId: string): Promise<NotificationPreferences | null> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) return null;

    const settings = workspace.settings ?? {};
    const allPrefs = (settings.notificationPreferences as Record<string, NotificationPreferences> | undefined) ?? {};
    return allPrefs[userId] ?? null;
  }

  async updateNotificationPreferences(workspaceId: string, userId: string, prefs: Partial<NotificationPreferences>): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) return false;

    const defaults: NotificationPreferences = {
      email: { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true },
      inApp: { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true },
      slack: { enabled: false, webhookUrl: null, channel: null },
    };

    const settings = workspace.settings ?? {};
    const allPrefs = (settings.notificationPreferences as Record<string, NotificationPreferences> | undefined) ?? {};
    const current = allPrefs[userId] ?? defaults;
    const next: NotificationPreferences = {
      email: { ...current.email, ...(prefs.email ?? {}) },
      inApp: { ...current.inApp, ...(prefs.inApp ?? {}) },
      slack: { ...current.slack, ...(prefs.slack ?? {}) },
    };

    return this.updateWorkspace(workspaceId, {
      settings: {
        ...settings,
        notificationPreferences: {
          ...allPrefs,
          [userId]: next,
        },
      },
    });
  }

  // API Keys
  async getApiKeys(workspaceId: string): Promise<ApiKey[]> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT id, workspace_id, name, key_hash, key_prefix, scopes, status,
              expires_at, created_by, revoked_by, revoked_at, last_used_at,
              calls_today, calls_this_month, created_at, updated_at
         FROM api_keys
        WHERE workspace_id = $1
        ORDER BY created_at DESC`,
      [workspaceId],
    );

    return rows.map((row) => this.mapApiKey(row));
  }

  async createApiKey(workspaceId: string, name: string): Promise<ApiKey & { fullKey: string }> {
    const fullKey = `ak_live_${randomBytes(24).toString('base64url')}`;
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = `${fullKey.slice(0, 8)}...${fullKey.slice(-4)}`;
    const scopes = ['read'];

    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO api_keys (workspace_id, name, key_hash, key_prefix, scopes, status, created_by, calls_today, calls_this_month)
       VALUES ($1, $2, $3, $4, $5, 'active', NULL, 0, 0)
       RETURNING id, workspace_id, name, key_hash, key_prefix, scopes, status,
                 expires_at, created_by, revoked_by, revoked_at, last_used_at,
                 calls_today, calls_this_month, created_at, updated_at`,
      [workspaceId, name, keyHash, keyPrefix, JSON.stringify(scopes)],
    );

    return { ...this.mapApiKey(rows[0]), fullKey };
  }

  async revokeApiKey(workspaceId: string, keyId: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE api_keys
          SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND status = 'active'`,
      [keyId, workspaceId],
    );
    return (rowCount ?? 0) > 0;
  }

  private mapApiKey(row: Record<string, unknown>): ApiKey {
    const scopes = Array.isArray(row.scopes)
      ? row.scopes as string[]
      : typeof row.scopes === 'string'
        ? JSON.parse(row.scopes) as string[]
        : [];

    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      name: row.name as string,
      keyHash: row.key_hash as string,
      keyPrefix: row.key_prefix as string,
      scopes,
      status: (row.status as ApiKey['status']) ?? 'active',
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      createdBy: (row.created_by as string | null) ?? null,
      revokedBy: (row.revoked_by as string | null) ?? null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : null,
      callsToday: Number(row.calls_today ?? 0),
      callsThisMonth: Number(row.calls_this_month ?? 0),
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
    };
  }
}
