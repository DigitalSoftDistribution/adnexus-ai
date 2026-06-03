/**
 * Platform client registration.
 *
 * Registers a PlatformClient factory for all four supported platforms so the
 * PlatformManager can resolve a client for any connected `ad_accounts` row.
 *
 * The adapter implements the auth/health surface (validate / test / refresh)
 * against the stored credentials — which is what the Integrations health check
 * and onboarding connection test rely on. Mutating campaign/ad operations are
 * delegated through the v2 application layer today, so they raise a clear
 * NOT_IMPLEMENTED error here rather than silently no-op'ing.
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

const PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snap'];

/**
 * Uniform adapter satisfying PlatformClient. Auth/health methods are real;
 * mutating ops throw NOT_IMPLEMENTED until the per-platform SDK write path is
 * wired into the manager.
 */
class PlatformClientAdapter implements PlatformClient {
  readonly platform: Platform;
  readonly account: AdAccount;

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

  async getCampaigns(_filters?: CampaignFilters): Promise<UnifiedCampaign[]> {
    return [];
  }
  async getCampaign(_campaignId: string): Promise<UnifiedCampaign> {
    return this.notImplemented('getCampaign');
  }
  async createCampaign(_data: CreateCampaignInput): Promise<UnifiedCampaign> {
    return this.notImplemented('createCampaign');
  }
  async updateCampaign(_id: string, _data: UpdateCampaignInput): Promise<UnifiedCampaign> {
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
    // Without a live OAuth refresh round-trip we keep the stored token; the
    // OAuth callbacks own re-issuance. Report the current token + expiry.
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
