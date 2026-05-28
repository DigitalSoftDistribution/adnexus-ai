import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';

export class MetaPlatformClient implements IPlatformClient {
  readonly platform = 'meta';

  private baseUrl = 'https://graph.facebook.com/v18.0';

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      // Delegates to existing meta-api service
      const { getMetaCampaigns } = await import('../../services/meta-api');
      const campaigns = await getMetaCampaigns(accountId);
      return ok(campaigns as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`Meta list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    try {
      const { getMetaCampaign } = await import('../../services/meta-api');
      const campaign = await getMetaCampaign(campaignId);
      return ok(campaign as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta get campaign failed: ${(error as Error).message}`));
    }
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { createMetaCampaign } = await import('../../services/meta-api');
      const campaign = await createMetaCampaign(accountId, data);
      return ok(campaign as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta create campaign failed: ${(error as Error).message}`));
    }
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { updateMetaCampaign } = await import('../../services/meta-api');
      const campaign = await updateMetaCampaign(campaignId, data);
      return ok(campaign as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta update campaign failed: ${(error as Error).message}`));
    }
  }

  async pauseCampaign(campaignId: string): Promise<Result<void>> {
    return this.updateCampaign(campaignId, { status: 'PAUSED' }).then(() => ok(undefined));
  }

  async activateCampaign(campaignId: string): Promise<Result<void>> {
    return this.updateCampaign(campaignId, { status: 'ACTIVE' }).then(() => ok(undefined));
  }

  async listAdSets(campaignId: string): Promise<Result<PlatformAdSet[]>> {
    return ok([]); // TODO: implement via meta-api
  }

  async updateAdSet(adsetId: string, data: Record<string, unknown>): Promise<Result<PlatformAdSet>> {
    return ok({} as PlatformAdSet); // TODO: implement
  }

  async listAds(adsetId: string): Promise<Result<PlatformAd[]>> {
    return ok([]); // TODO: implement
  }

  async updateAd(adId: string, data: Record<string, unknown>): Promise<Result<PlatformAd>> {
    return ok({} as PlatformAd); // TODO: implement
  }

  async getInsights(
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    dateRange: { since: string; until: string },
    fields?: string[],
  ): Promise<Result<Record<string, unknown>>> {
    return ok({}); // TODO: implement
  }

  async healthCheck(): Promise<Result<{ status: string; latencyMs: number }>> {
    const start = Date.now();
    try {
      // Lightweight health check - verify API is reachable
      const response = await fetch(`${this.baseUrl}/me?access_token=test`);
      const latencyMs = Date.now() - start;
      return ok({ status: response.ok ? 'healthy' : 'degraded', latencyMs });
    } catch {
      return ok({ status: 'unhealthy', latencyMs: Date.now() - start });
    }
  }
}
