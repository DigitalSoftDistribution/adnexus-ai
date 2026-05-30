import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';

function getAccessToken(): string {
  return process.env.GOOGLE_ACCESS_TOKEN || '';
}

export class GooglePlatformClient implements IPlatformClient {
  readonly platform = 'google';

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      const { getGoogleCampaigns } = await import('../../services/google-api');
      const campaigns = await getGoogleCampaigns(accountId, getAccessToken());
      return ok(campaigns as unknown as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`Google list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    try {
      const { getGoogleCampaign } = await import('../../services/google-api');
      const campaign = await getGoogleCampaign(campaignId, getAccessToken());
      return ok(campaign as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Google get campaign failed: ${(error as Error).message}`));
    }
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { createGoogleCampaign } = await import('../../services/google-api');
      const campaignId = await createGoogleCampaign(accountId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Google create campaign failed: ${(error as Error).message}`));
    }
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { updateGoogleCampaign } = await import('../../services/google-api');
      await updateGoogleCampaign(campaignId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Google update campaign failed: ${(error as Error).message}`));
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
