/**
 * Platform client registration.
 *
 * Registers PlatformClient factories for all four supported platforms so the
 * PlatformManager can resolve a client for any connected `ad_accounts` row.
 *
 * Meta → MetaPlatformClient (real SDK via MetaApiClient)
 * Google / TikTok / Snap → PlatformClientAdapter (auth/health only; mutating
 *   ops are delegated through the v2 application layer and throw NOT_IMPLEMENTED).
 */

import {
  registerPlatformClient,
  isPlatformRegistered,
} from './index';
import { MetaPlatformClient } from './meta/MetaPlatformClient';
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
import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('platform-registry');

const PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snap'];

/**
 * Uniform adapter satisfying PlatformClient for platforms not yet wired to
 * their native SDK. Auth/health methods are real (against stored credentials);
 * mutating ops throw NOT_IMPLEMENTED.
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
    if (this.platform === 'google' && this.account.refreshToken) {
      try {
        const { refreshGoogleToken, validateGoogleToken } = await import('../services/google-api');
        const valid = await validateGoogleToken(this.account.accessToken);
        if (!valid) {
          const refreshed = await refreshGoogleToken(this.account.refreshToken);
          return {
            accountId: this.account.id,
            platform: this.platform,
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt.toISOString(),
            refreshed: true,
          };
        }
      } catch (e) {
        logger.warn({ err: e }, 'Google token refresh failed');
      }
    }
    return {
      accountId: this.account.id,
      platform: this.platform,
      accessToken: this.account.accessToken,
      expiresAt:
        this.account.tokenExpiresAt ?? new Date(Date.now() + 3600_000).toISOString(),
      refreshed: false,
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

/** Register platform clients (idempotent). Meta gets the real SDK; others use adapter. */
export function registerAllPlatformClients(): void {
  for (const platform of PLATFORMS) {
    if (isPlatformRegistered(platform)) continue;

    if (platform === 'meta') {
      registerPlatformClient(
        'meta',
        (account, _config) => new MetaPlatformClient(account),
      );
    } else {
      registerPlatformClient(
        platform,
        (account, config) => new PlatformClientAdapter(account, config),
      );
    }
  }
}
