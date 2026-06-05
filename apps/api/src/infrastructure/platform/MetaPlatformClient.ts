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

  async listAdSets(campaignId: string): Promise<Result<PlatformAdSet[]>> {
    try {
      const { getMetaAdSets } = await import('../../services/meta-api');
      const adSets = await getMetaAdSets(campaignId, getAccessToken());
      return ok(
        adSets.map((a) => ({
          id: a.id,
          name: a.name,
          campaignId: a.campaign_id,
          status: a.status === 'ACTIVE' ? 'active' : a.status === 'PAUSED' ? 'paused' : 'ended',
          budget: a.daily_budget ? parseInt(a.daily_budget) / 100 : a.lifetime_budget ? parseInt(a.lifetime_budget) / 100 : undefined,
          bidAmount: a.bid_amount ? parseInt(a.bid_amount) / 100 : undefined,
          targeting: a.targeting,
        })),
      );
    } catch (error) {
      return err(new Error(`Meta list ad sets failed: ${(error as Error).message}`));
    }
  }

  async updateAdSet(adsetId: string, data: Record<string, unknown>): Promise<Result<PlatformAdSet>> {
    try {
      const { updateMetaAdSet } = await import('../../services/meta-api');
      await updateMetaAdSet(adsetId, getAccessToken(), data);
      return ok({ id: adsetId } as PlatformAdSet);
    } catch (error) {
      return err(new Error(`Meta update ad set failed: ${(error as Error).message}`));
    }
  }

  async listAds(adsetId: string): Promise<Result<PlatformAd[]>> {
    try {
      const { getMetaAds } = await import('../../services/meta-api');
      const ads = await getMetaAds(adsetId, getAccessToken());
      return ok(
        ads.map((a) => ({
          id: a.id,
          name: a.name,
          adsetId: a.adset_id,
          status: a.status === 'ACTIVE' ? 'active' : a.status === 'PAUSED' ? 'paused' : 'ended',
          creativeType: a.creative?.object_type as string | undefined,
          creativeData: a.creative,
        })),
      );
    } catch (error) {
      return err(new Error(`Meta list ads failed: ${(error as Error).message}`));
    }
  }

  async updateAd(adId: string, data: Record<string, unknown>): Promise<Result<PlatformAd>> {
    try {
      const { updateMetaAd } = await import('../../services/meta-api');
      await updateMetaAd(adId, getAccessToken(), data);
      return ok({ id: adId } as PlatformAd);
    } catch (error) {
      return err(new Error(`Meta update ad failed: ${(error as Error).message}`));
    }
  }

  async getInsights(
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    dateRange: { since: string; until: string },
    fields?: string[],
  ): Promise<Result<Record<string, unknown>>> {
    try {
      const { getMetaInsights } = await import('../../services/meta-api');
      const insights = await getMetaInsights(
        entityId,
        getAccessToken(),
        dateRange.since,
        dateRange.until,
        fields?.join(','),
      );
      return ok(insights);
    } catch (error) {
      return err(new Error(`Meta get insights failed: ${(error as Error).message}`));
    }
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
