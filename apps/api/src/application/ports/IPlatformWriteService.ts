import type { Platform } from '../../domain/entities/Campaign';

export interface PlatformWriteContext {
  platform: Platform;
  /** The platform's own campaign id (campaigns.platform_campaign_id). */
  platformCampaignId: string;
  /** The owning ad_accounts.id, used to resolve a valid access token. */
  adAccountId: string;
}

export type PlatformWriteResult =
  | { applied: true }
  /** Not attempted: platform unsupported / no platform id / no token. */
  | { applied: false; reason: 'unsupported' | 'not_connected' | 'no_platform_id' }
  /** Attempted but the platform rejected it. */
  | { applied: false; reason: 'platform_error'; message: string };

/**
 * Port for mutating campaign state on the ad platform itself (not just the local
 * DB row). Implementations resolve a per-account token and call the platform
 * API. Returning `applied: false` lets callers decide whether to still persist
 * locally or surface the failure.
 */
export interface IPlatformWriteService {
  supports(platform: Platform): boolean;
  pauseCampaign(ctx: PlatformWriteContext): Promise<PlatformWriteResult>;
  resumeCampaign(ctx: PlatformWriteContext): Promise<PlatformWriteResult>;
}
