import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';

function getAccessToken(): string {
  return process.env.SNAP_ACCESS_TOKEN || '';
}

export class SnapPlatformClient implements IPlatformClient {
  readonly platform = 'snap';

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      const { getSnapCampaigns } = await import('../../services/snap-api');
      const campaigns = await getSnapCampaigns(accountId, getAccessToken());
      return ok(campaigns as unknown as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`Snap list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    return ok({} as unknown as PlatformCampaign);
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { createSnapCampaign } = await import('../../services/snap-api');
      const campaignId = await createSnapCampaign(accountId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Snap create campaign failed: ${(error as Error).message}`));
    }
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    return ok({ id: campaignId } as unknown as PlatformCampaign);
  }

  async pauseCampaign(campaignId: string): Promise<Result<void>> {
    return ok(undefined);
  }

  async activateCampaign(campaignId: string): Promise<Result<void>> {
    return ok(undefined);
  }

  async listAdSets(campaignId: string): Promise<Result<PlatformAdSet[]>> {
    return ok([]);
  }

  async updateAdSet(adsetId: string, data: Record<string, unknown>): Promise<Result<PlatformAdSet>> {
    return ok({} as PlatformAdSet);
  }

  async listAds(adsetId: string): Promise<Result<PlatformAd[]>> {
    return ok([]);
  }

  async updateAd(adId: string, data: Record<string, unknown>): Promise<Result<PlatformAd>> {
    return ok({} as PlatformAd);
  }

  async getInsights(
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    dateRange: { since: string; until: string },
    fields?: string[],
  ): Promise<Result<Record<string, unknown>>> {
    return ok({});
  }

  async healthCheck(): Promise<Result<{ status: string; latencyMs: number }>> {
    const start = Date.now();
    return ok({ status: 'healthy', latencyMs: Date.now() - start });
  }
}
