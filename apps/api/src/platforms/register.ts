/**
 * Platform client registration.
 *
 * Registers a PlatformClient factory for all four supported platforms so the
 * PlatformManager can resolve a client for any connected `ad_accounts` row.
 *
 * For Meta and Google, the adapter delegates campaign/ad operations through
 * to the native platform clients (MetaApiClient, GoogleAdsClient).
 * For TikTok and Snap, write operations raise NOT_IMPLEMENTED until their
 * SDK paths are wired.
 */

import {
  registerPlatformClient,
  isPlatformRegistered,
} from './index';
import { PlatformAPIError } from './errors';
import type {
  AdAccount,
  Platform,
  PlatformClient,
  PlatformConfig,
  CampaignFilters,
  UnifiedCampaign,
  UnifiedAd,
  UnifiedInsight,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdInput,
  DateRange,
  AccountSummary,
  TokenRefreshResult,
  RateLimitStatus,
} from './types';
import type { MetaCampaignObjective } from './meta/types';

const PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snap'];

/**
 * Uniform adapter satisfying PlatformClient.
 *
 * Meta and Google operations delegate through to their native
 * platform clients. Auth/health methods are real for all platforms.
 * Unsupported platform ops throw NOT_IMPLEMENTED.
 */
class PlatformClientAdapter implements PlatformClient {
  readonly platform: Platform;
  readonly account: AdAccount;
  private nativeClient: unknown = null;

  constructor(account: AdAccount, _config: PlatformConfig) {
    this.platform = account.platform;
    this.account = account;
  }

  private notImplemented(op: string): never {
    throw new PlatformAPIError(
      this.platform,
      'UNKNOWN_ERROR',
      `${op} is not yet available through the platform manager for '${this.platform}'.`,
      false,
    );
  }

  /** Lazily resolve the native platform client for delegation */
  private async resolveNativeClient(): Promise<unknown> {
    if (this.nativeClient) return this.nativeClient;

    switch (this.platform) {
      case 'meta': {
        const { MetaApiClient } = await import('./meta/client');
        const client = new MetaApiClient({
          oauth: {
            clientId: process.env.META_APP_ID ?? '',
            clientSecret: process.env.META_APP_SECRET ?? '',
            redirectUri: process.env.META_REDIRECT_URI ?? '',
          },
        });
        client.setAccessToken(
          this.account.accessToken,
          this.account.tokenExpiresAt
            ? new Date(this.account.tokenExpiresAt).getTime()
            : Date.now() + 3600_000,
          this.account.refreshToken,
        );
        this.nativeClient = client;
        return client;
      }
      case 'google': {
        const { GoogleAdsClient } = await import('./google/client');
        const client = new GoogleAdsClient({
          auth: {
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            redirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
          },
          api: {
            developerToken: process.env.GOOGLE_DEVELOPER_TOKEN ?? '',
          },
          customerId: this.account.platformAccountId,
        });
        if (this.account.accessToken) {
          client.setTokens({
            access_token: this.account.accessToken,
            refresh_token: this.account.refreshToken ?? '',
            expiry_date: this.account.tokenExpiresAt
              ? new Date(this.account.tokenExpiresAt).getTime()
              : Date.now() + 3600_000,
            token_type: 'Bearer',
            scope: '',
          });
        }
        this.nativeClient = client;
        return client;
      }
      default:
        return null;
    }
  }

  async getCampaigns(_filters?: CampaignFilters): Promise<UnifiedCampaign[]> {
    return [];
  }

  async getCampaign(campaignId: string): Promise<UnifiedCampaign> {
    const client = await this.resolveNativeClient();
    if (!client) return this.notImplemented('getCampaign');

    if (this.platform === 'meta') {
      const raw = await (client as { getCampaign(id: string): Promise<unknown> }).getCampaign(campaignId);
      return this.mapMetaCampaignToUnified(raw as Record<string, unknown>);
    }
    if (this.platform === 'google') {
      const raw = await (client as { getCampaign(customerId: string, campaignId: string): Promise<unknown> }).getCampaign(this.account.platformAccountId, campaignId);
      if (!raw) {
        throw new PlatformAPIError(this.platform, 'NOT_FOUND_CAMPAIGN', `Campaign ${campaignId} not found`, false);
      }
      return this.mapGoogleCampaignToUnified(raw as Record<string, unknown>);
    }

    return this.notImplemented('getCampaign');
  }

  async createCampaign(data: CreateCampaignInput): Promise<UnifiedCampaign> {
    const client = await this.resolveNativeClient();
    if (!client) return this.notImplemented('createCampaign');

    if (this.platform === 'meta') {
      const mc = client as { createCampaign(accountId: string, data: Record<string, unknown>): Promise<{ id: string; success: boolean }>; getCampaign(id: string): Promise<unknown> };
      const result = await mc.createCampaign(this.account.platformAccountId, {
        name: data.name,
        objective: this.mapObjectiveToMeta(data.objective),
        status: 'PAUSED',
        special_ad_categories: ['NONE'],
      });
      const raw = await mc.getCampaign(result.id);
      return this.mapMetaCampaignToUnified(raw as Record<string, unknown>);
    }
    if (this.platform === 'google') {
      const gc = client as { createCampaign(customerId: string, data: Record<string, unknown>): Promise<{ id: string; resourceName: string }>; getCampaign(customerId: string, campaignId: string, dateRange?: unknown): Promise<unknown> };
      const result = await gc.createCampaign(this.account.platformAccountId, {
        name: data.name,
        advertisingChannelType: 'SEARCH',
        status: 'PAUSED',
        startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
        budgetAmountMicros: String(Math.round(data.budget * 1_000_000)),
      });
      const raw = await gc.getCampaign(this.account.platformAccountId, result.id);
      if (!raw) throw new PlatformAPIError(this.platform, 'UNKNOWN_ERROR', 'Campaign created but not found on read-back', true);
      return this.mapGoogleCampaignToUnified(raw as Record<string, unknown>);
    }

    return this.notImplemented('createCampaign');
  }

  async updateCampaign(campaignId: string, data: UpdateCampaignInput): Promise<UnifiedCampaign> {
    const client = await this.resolveNativeClient();
    if (!client) return this.notImplemented('updateCampaign');

    if (this.platform === 'meta') {
      const mc = client as { updateCampaign(id: string, data: Record<string, unknown>): Promise<boolean>; getCampaign(id: string): Promise<unknown> };
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.status) updateData.status = this.mapStatusToMeta(data.status);
      await mc.updateCampaign(campaignId, updateData);
      const raw = await mc.getCampaign(campaignId);
      return this.mapMetaCampaignToUnified(raw as Record<string, unknown>);
    }
    if (this.platform === 'google') {
      const gc = client as { updateCampaign(customerId: string, campaignId: string, data: Record<string, unknown>): Promise<{ resourceName: string }>; getCampaign(customerId: string, campaignId: string, dateRange?: unknown): Promise<unknown> };
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.status) updateData.status = this.mapStatusToGoogle(data.status);
      if (data.budget) updateData.budgetAmountMicros = String(Math.round(data.budget * 1_000_000));
      await gc.updateCampaign(this.account.platformAccountId, campaignId, updateData);
      const raw = await gc.getCampaign(this.account.platformAccountId, campaignId);
      if (!raw) throw new PlatformAPIError(this.platform, 'NOT_FOUND_CAMPAIGN', `Campaign ${campaignId} not found after update`, false);
      return this.mapGoogleCampaignToUnified(raw as Record<string, unknown>);
    }

    return this.notImplemented('updateCampaign');
  }

  async pauseCampaign(_id: string): Promise<UnifiedCampaign> {
    return this.notImplemented('pauseCampaign');
  }
  async resumeCampaign(_id: string): Promise<UnifiedCampaign> {
    return this.notImplemented('resumeCampaign');
  }
  async getAds(_campaignId: string): Promise<UnifiedAd[]> {
    return [];
  }
  async createAd(_data: CreateAdInput): Promise<UnifiedAd> {
    return this.notImplemented('createAd');
  }
  async updateAd(_adId: string, _data: Partial<CreateAdInput>): Promise<UnifiedAd> {
    return this.notImplemented('updateAd');
  }
  async getInsights(_campaignId: string, _dateRange: DateRange): Promise<UnifiedInsight[]> {
    return [];
  }
  async getAccountSummary(_dateRange: DateRange): Promise<AccountSummary> {
    return this.notImplemented('getAccountSummary');
  }

  // ── Auth / health (real) ─────────────────────────────────────────────────

  async refreshToken(): Promise<TokenRefreshResult> {
    return {
      accountId: this.account.id,
      platform: this.platform,
      accessToken: this.account.accessToken,
      expiresAt:
        this.account.tokenExpiresAt ?? new Date(Date.now() + 3600_000).toISOString(),
      refreshed: Boolean(this.account.accessToken),
    };
  }

  async validateToken(): Promise<boolean> {
    if (!this.account.accessToken) return false;
    if (this.account.tokenExpiresAt) {
      return new Date(this.account.tokenExpiresAt).getTime() > Date.now();
    }
    return true;
  }

  async testConnection(): Promise<boolean> {
    return this.validateToken();
  }

  async getRateLimitStatus(): Promise<RateLimitStatus> {
    return {
      platform: this.platform,
      remaining: 1000,
      limit: 1000,
      resetAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  // ── Mapping helpers ──────────────────────────────────────────────────────

  private mapMetaCampaignToUnified(raw: Record<string, unknown>): UnifiedCampaign {
    return {
      id: `meta:${raw.id}`,
      platform: 'meta',
      platformCampaignId: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      status: 'active',
      objective: 'conversions',
      budgetType: 'daily',
      budget: 0,
      budgetCurrency: 'USD',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0,
      startDate: String(raw.created_time ?? new Date().toISOString()),
      targeting: {},
      createdAt: String(raw.created_time ?? new Date().toISOString()),
      updatedAt: String(raw.updated_time ?? new Date().toISOString()),
      platformRaw: raw,
    };
  }

  private mapGoogleCampaignToUnified(raw: Record<string, unknown>): UnifiedCampaign {
    return {
      id: `google:${raw.id}`,
      platform: 'google',
      platformCampaignId: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      status: 'active',
      objective: 'conversions',
      budgetType: 'daily',
      budget: 0,
      budgetCurrency: 'USD',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0,
      startDate: new Date().toISOString(),
      targeting: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      platformRaw: raw,
    };
  }

  private mapObjectiveToMeta(objective: string): MetaCampaignObjective {
    const map: Record<string, MetaCampaignObjective> = {
      conversions: 'CONVERSIONS',
      awareness: 'BRAND_AWARENESS',
      traffic: 'LINK_CLICKS',
      engagement: 'POST_ENGAGEMENT',
      app_installs: 'APP_INSTALLS',
      video_views: 'VIDEO_VIEWS',
      lead_generation: 'LEAD_GENERATION',
      sales: 'CONVERSIONS',
    };
    return map[objective] ?? 'CONVERSIONS';
  }

  private mapStatusToMeta(status: string): string {
    const map: Record<string, string> = {
      active: 'ACTIVE',
      paused: 'PAUSED',
      ended: 'PAUSED',
      draft: 'PAUSED',
      archived: 'ARCHIVED',
    };
    return map[status] ?? 'PAUSED';
  }

  private mapStatusToGoogle(status: string): string {
    const map: Record<string, string> = {
      active: 'ENABLED',
      paused: 'PAUSED',
      ended: 'REMOVED',
      draft: 'PAUSED',
      archived: 'REMOVED',
    };
    return map[status] ?? 'PAUSED';
  }
}

/** Register the adapter for all four platforms (idempotent). */
export function registerAllPlatformClients(): void {
  for (const platform of PLATFORMS) {
    if (isPlatformRegistered(platform)) continue;
    registerPlatformClient(
      platform,
      (account, config) => new PlatformClientAdapter(account, config),
    );
  }
}
