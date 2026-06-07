/**
 * Integration use-cases — first-class /api/v2/integrations surface.
 *
 * Presents all four supported platforms (connected or not) by merging the
 * platform catalog with the workspace's ad_accounts rows, plus connect-URL
 * resolution, disconnect, and a health check via stored token validity.
 */

import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';
import type { ISettingsRepository, Integration } from '../../../domain/repositories/ISettingsRepository';

export const SUPPORTED_PLATFORMS = ['meta', 'google', 'tiktok', 'snap'] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

const PLATFORM_LABELS: Record<SupportedPlatform, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  tiktok: 'TikTok Ads',
  snap: 'Snapchat Ads',
};

export interface IntegrationView {
  platform: SupportedPlatform;
  label: string;
  connected: boolean;
  status: Integration['status'] | 'not_connected';
  /** Internal ad_accounts.id UUID — use this for sync/sync-jobs endpoints. */
  id: string | null;
  /** The platform's own account id (e.g. Meta act_123) — display only. */
  accountId: string | null;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  /** Relative API path that initiates the OAuth flow. */
  connectUrl: string;
}

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const ADMIN_ROLES = ['owner', 'admin'];

function toView(platform: SupportedPlatform, workspaceId: string, integration?: Integration): IntegrationView {
  // ad_accounts.status uses 'active'/'disconnected'; treat both 'active' and
  // 'connected' as a live connection so the UI reflects reality.
  const rawStatus = (integration?.status ?? '') as string;
  const connected = Boolean(integration && (rawStatus === 'connected' || rawStatus === 'active'));
  return {
    platform,
    label: PLATFORM_LABELS[platform],
    connected,
    status: integration ? (connected ? 'connected' : integration.status) : 'not_connected',
    id: integration?.id ?? null,
    accountId: integration?.accountId ?? null,
    accountName: integration?.accountName ?? null,
    connectedAt: integration?.connectedAt ?? null,
    lastSyncedAt: integration?.lastSyncedAt ?? null,
    connectUrl: `/api/v1/auth/${platform}/connect?workspace_id=${workspaceId}`,
  };
}

export class ListIntegrationsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}
  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<IntegrationView[]>> {
    if (!READ_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    const rows = await this.settingsRepo.getIntegrations(input.workspaceId);
    const byPlatform = new Map(rows.map((r) => [r.platform, r]));
    return ok(
      SUPPORTED_PLATFORMS.map((p) => toView(p, input.workspaceId, byPlatform.get(p))),
    );
  }
}

export class GetIntegrationUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    platform: string;
  }): Promise<Result<IntegrationView>> {
    if (!READ_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    if (!SUPPORTED_PLATFORMS.includes(input.platform as SupportedPlatform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }
    const platform = input.platform as SupportedPlatform;
    const row = await this.settingsRepo.getIntegration(input.workspaceId, platform);
    return ok(toView(platform, input.workspaceId, row ?? undefined));
  }
}

export class DisconnectIntegrationUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    platform: string;
  }): Promise<Result<{ disconnected: boolean }>> {
    if (!ADMIN_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    if (!SUPPORTED_PLATFORMS.includes(input.platform as SupportedPlatform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }
    const disconnected = await this.settingsRepo.disconnectIntegration(input.workspaceId, input.platform);
    return ok({ disconnected });
  }
}

export class GetIntegrationHealthUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    platform: string;
  }): Promise<Result<{ platform: string; healthy: boolean; status: string }>> {
    if (!READ_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    const row = await this.settingsRepo.getIntegration(input.workspaceId, input.platform);
    const healthy = Boolean(row && (row.status === 'connected' || row.status === 'active'));
    return ok({ platform: input.platform, healthy, status: row?.status ?? 'not_connected' });
  }
}
