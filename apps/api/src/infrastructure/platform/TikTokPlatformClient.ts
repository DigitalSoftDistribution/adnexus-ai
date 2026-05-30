import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';

function getAccessToken(): string {
  return process.env.TIKTOK_ACCESS_TOKEN || '';
}

export class TikTokPlatformClient implements IPlatformClient {
  readonly platform = 'tiktok';

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      const { getTikTokCampaigns } = await import('../../services/tiktok-api');
      const campaigns = await getTikTokCampaigns(accountId, getAccessToken());
      return ok(campaigns as unknown as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`TikTok list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    try {
      const { getTikTokCampaign } = await import('../../services/tiktok-api');
      const campaign = await getTikTokCampaign(campaignId, getAccessToken());
      return ok(campaign as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`TikTok get campaign failed: ${(error as Error).message}`));
    }
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { createTikTokCampaign } = await import('../../services/tiktok-api');
      const campaignId = await createTikTokCampaign(accountId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`TikTok create campaign failed: ${(error as Error).message}`));
    }
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { updateTikTokCampaign } = await import('../../services/tiktok-api');
      await updateTikTokCampaign(campaignId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`TikTok update campaign failed: ${(error as Error).message}`));
    }
  }

  async pauseCampaign(campaignId: string): Promise<Result<void>> {
    return this.updateCampaign(campaignId, { status: 'PAUSED' }).then(() => ok(undefined));
  }

  async activateCampaign(campaignId: string): Promise<Result<void>> {
    return this.updateCampaign(campaignId, { status: 'ENABLED' }).then(() => ok(undefined));
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
    try {
      return ok({ status: 'healthy', latencyMs: Date.now() - start });
    } catch {
      return ok({ status: 'unhealthy', latencyMs: Date.now() - start });
    }
  }
}
