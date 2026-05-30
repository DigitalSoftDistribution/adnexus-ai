import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';

// TODO: Get access token from workspace settings / OAuth token storage
function getAccessToken(): string {
  return process.env.META_ACCESS_TOKEN || '';
}

export class MetaPlatformClient implements IPlatformClient {
  readonly platform = 'meta';

  private baseUrl = 'https://graph.facebook.com/v18.0';

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      const { getMetaCampaigns } = await import('../../services/meta-api');
      const campaigns = await getMetaCampaigns(accountId, getAccessToken());
      return ok(campaigns as unknown as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`Meta list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    try {
      const { getMetaCampaign } = await import('../../services/meta-api');
      const campaign = await getMetaCampaign(campaignId, getAccessToken());
      return ok(campaign as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta get campaign failed: ${(error as Error).message}`));
    }
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { createMetaCampaign } = await import('../../services/meta-api');
      const campaignId = await createMetaCampaign(
        accountId,
        getAccessToken(),
        {
          name: String(data.name || ''),
          objective: String(data.objective || ''),
          status: String(data.status || 'PAUSED'),
          daily_budget: typeof data.dailyBudget === 'number' ? data.dailyBudget : undefined,
        },
      );
      return ok({ id: campaignId } as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta create campaign failed: ${(error as Error).message}`));
    }
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const { updateMetaCampaign } = await import('../../services/meta-api');
      await updateMetaCampaign(campaignId, getAccessToken(), data);
      return ok({ id: campaignId } as unknown as PlatformCampaign);
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

  async listAdSets(_campaignId: string): Promise<Result<PlatformAdSet[]>> {
    return ok([]); // TODO: implement via meta-api
  }

  async updateAdSet(_adsetId: string, _data: Record<string, unknown>): Promise<Result<PlatformAdSet>> {
    return ok({} as PlatformAdSet); // TODO: implement
  }

  async listAds(_adsetId: string): Promise<Result<PlatformAd[]>> {
    return ok([]); // TODO: implement
  }

  async updateAd(_adId: string, _data: Record<string, unknown>): Promise<Result<PlatformAd>> {
    return ok({} as PlatformAd); // TODO: implement
  }

  async getInsights(
    _entityId: string,
    _entityType: 'campaign' | 'adset' | 'ad',
    _dateRange: { since: string; until: string },
    _fields?: string[],
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
