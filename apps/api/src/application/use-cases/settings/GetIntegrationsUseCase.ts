import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { Integration } from '../../../domain/repositories/ISettingsRepository';
import { AD_PLATFORM_CAPABILITIES, AD_PLATFORM_ORDER } from '../../ports/AdPlatformCapabilities';
import type { AdPlatformCapability } from '../../ports/AdPlatformCapabilities';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetIntegrationsInput {
  workspaceId: string;
  userRole: string;
}

export interface IntegrationReadiness extends Integration {
  label: string;
  connected: boolean;
  connectUrl: string;
  capability: AdPlatformCapability;
}

export class GetIntegrationsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetIntegrationsInput): Promise<Result<IntegrationReadiness[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const integrations = await this.settingsRepo.getIntegrations(input.workspaceId);
    const byPlatform = new Map(integrations.map((integration) => [integration.platform, integration]));

    return ok(
      AD_PLATFORM_ORDER.map((platform) => {
        const existing = byPlatform.get(platform);
        const capability = AD_PLATFORM_CAPABILITIES[platform];
        return {
          id: existing?.id ?? '',
          platform,
          name: existing?.name ?? capability.label,
          label: capability.label,
          status: existing?.status ?? 'disconnected',
          connected: existing?.status === 'active' || existing?.status === 'connected',
          accountId: existing?.accountId ?? null,
          accountName: existing?.accountName ?? null,
          connectedAt: existing?.connectedAt ?? null,
          lastSyncedAt: existing?.lastSyncedAt ?? null,
          connectUrl: `/api/v1/auth/${platform}/connect`,
          capability,
        } satisfies IntegrationReadiness;
      }),
    );
  }
}
