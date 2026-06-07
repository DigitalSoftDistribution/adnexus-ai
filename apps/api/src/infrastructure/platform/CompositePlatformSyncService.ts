import type {
  IPlatformSyncService,
  SyncAccountContext,
  SyncAccountResult,
  SyncCampaignContext,
  SyncedCampaignMetrics,
} from '../../application/ports/IPlatformSyncService';
import type { Platform } from '../../domain/entities/Campaign';

export class CompositePlatformSyncService implements IPlatformSyncService {
  constructor(private readonly services: IPlatformSyncService[]) {}

  supports(platform: Platform): boolean {
    return this.services.some((service) => service.supports(platform));
  }

  private serviceFor(platform: Platform): IPlatformSyncService | null {
    return this.services.find((service) => service.supports(platform)) ?? null;
  }

  async syncCampaign(ctx: SyncCampaignContext): Promise<SyncedCampaignMetrics | null> {
    return this.serviceFor(ctx.platform)?.syncCampaign(ctx) ?? null;
  }

  async syncAccount(ctx: SyncAccountContext): Promise<SyncAccountResult | null> {
    return this.serviceFor(ctx.platform)?.syncAccount(ctx) ?? null;
  }
}
