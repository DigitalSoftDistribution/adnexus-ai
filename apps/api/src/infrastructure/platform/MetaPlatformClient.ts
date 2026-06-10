import type { IPlatformClient, PlatformCampaign, PlatformAdSet, PlatformAd } from '../../application/ports/IPlatformClient';
import type { Result } from '../../domain/value-objects/Result';
import { ok, err } from '../../domain/value-objects/Result';
import { resolveMetaAccessToken } from './metaToken';

const NOT_CONNECTED = 'Meta account is not connected — connect Meta in workspace integrations';

/**
 * Meta Marketing API client scoped to a single `ad_accounts` row.
 *
 * Access tokens are resolved per workspace connection via OAuth (see metaToken.ts).
 * `META_ACCESS_TOKEN` is only used as a development/test fallback.
 */
export class MetaPlatformClient implements IPlatformClient {
  readonly platform = 'meta';

  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(private readonly adAccountId: string) {}

  private async resolveAccessToken(): Promise<string | null> {
    return resolveMetaAccessToken(this.adAccountId);
  }

  async listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { getMetaCampaigns } = await import('../../services/meta-api');
      const campaigns = await getMetaCampaigns(accountId, token);
      return ok(campaigns as unknown as PlatformCampaign[]);
    } catch (error) {
      return err(new Error(`Meta list campaigns failed: ${(error as Error).message}`));
    }
  }

  async getCampaign(campaignId: string): Promise<Result<PlatformCampaign>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { getMetaCampaign } = await import('../../services/meta-api');
      const campaign = await getMetaCampaign(campaignId, token);
      return ok(campaign as unknown as PlatformCampaign);
    } catch (error) {
      return err(new Error(`Meta get campaign failed: ${(error as Error).message}`));
    }
  }

  async createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { createMetaCampaign } = await import('../../services/meta-api');
      const campaignId = await createMetaCampaign(
        accountId,
        token,
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
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { updateMetaCampaign } = await import('../../services/meta-api');
      await updateMetaCampaign(campaignId, token, data);
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
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { getMetaAdSets } = await import('../../services/meta-api');
      const adSets = await getMetaAdSets(campaignId, token);
      return ok(adSets as unknown as PlatformAdSet[]);
    } catch (error) {
      return err(new Error(`Meta list ad sets failed: ${(error as Error).message}`));
    }
  }

  async updateAdSet(adsetId: string, data: Record<string, unknown>): Promise<Result<PlatformAdSet>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { updateMetaCampaign } = await import('../../services/meta-api');
      await updateMetaCampaign(adsetId, token, data);
      return ok({ id: adsetId } as unknown as PlatformAdSet);
    } catch (error) {
      return err(new Error(`Meta update ad set failed: ${(error as Error).message}`));
    }
  }

  async listAds(adsetId: string): Promise<Result<PlatformAd[]>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { getMetaAds } = await import('../../services/meta-api');
      const ads = await getMetaAds(adsetId, token);
      return ok(ads as unknown as PlatformAd[]);
    } catch (error) {
      return err(new Error(`Meta list ads failed: ${(error as Error).message}`));
    }
  }

  async updateAd(adId: string, data: Record<string, unknown>): Promise<Result<PlatformAd>> {
    try {
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { updateMetaCampaign } = await import('../../services/meta-api');
      await updateMetaCampaign(adId, token, data);
      return ok({ id: adId } as unknown as PlatformAd);
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
      const token = await this.resolveAccessToken();
      if (!token) return err(new Error(NOT_CONNECTED));

      const { getMetaInsights } = await import('../../services/meta-api');
      const insights = await getMetaInsights(
        entityId,
        token,
        dateRange.since,
        dateRange.until,
        undefined,
        entityType,
        fields,
      );
      return ok(insights);
    } catch (error) {
      return err(new Error(`Meta insights failed: ${(error as Error).message}`));
    }
  }

  async healthCheck(): Promise<Result<{ status: string; latencyMs: number }>> {
    const start = Date.now();
    try {
      const token = await this.resolveAccessToken();
      if (!token) {
        return ok({ status: 'not_connected', latencyMs: Date.now() - start });
      }

      const response = await fetch(
        `${this.baseUrl}/me?access_token=${encodeURIComponent(token)}`,
      );
      const latencyMs = Date.now() - start;
      return ok({ status: response.ok ? 'healthy' : 'degraded', latencyMs });
    } catch {
      return ok({ status: 'unhealthy', latencyMs: Date.now() - start });
    }
  }
}
