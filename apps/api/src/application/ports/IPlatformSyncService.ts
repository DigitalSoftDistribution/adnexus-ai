import type { Platform } from '../../domain/entities/Campaign';

/**
 * Live metrics pulled from an ad platform for a single campaign.
 *
 * All numeric fields are in account currency (spend) or raw counts. The sync
 * service is responsible for translating platform-specific shapes (e.g. Meta's
 * stringified `daily_budget` in minor units, `purchase_roas` arrays) into these
 * normalized values before returning them.
 */
export interface SyncedCampaignMetrics {
  status?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  cpm: number;
  cpc: number;
}

export interface SyncCampaignContext {
  platform: Platform;
  /** The platform's own campaign id (campaigns.platform_campaign_id). */
  platformCampaignId: string;
  /** The owning ad_accounts.id, used to resolve a valid access token. */
  adAccountId: string;
  /** Lookback window for insights, inclusive (ISO yyyy-mm-dd). */
  dateRange?: { since: string; until: string };
}

/** A single campaign imported from a platform during an account-level sync. */
export interface SyncedCampaign {
  platformCampaignId: string;
  name: string;
  status: string;
  objective?: string | null;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  budgetType?: 'daily' | 'lifetime' | null;
  startDate?: string | null;
  endDate?: string | null;
  metrics: SyncedCampaignMetrics;
}

export interface SyncAccountContext {
  platform: Platform;
  /** The internal ad_accounts.id. */
  adAccountId: string;
  /** The platform's own account id (ad_accounts.platform_account_id). */
  platformAccountId: string;
  /** Lookback window for insights, inclusive (ISO yyyy-mm-dd). */
  dateRange?: { since: string; until: string };
}

export interface SyncAccountResult {
  campaigns: SyncedCampaign[];
  /** Non-fatal errors collected during the run (partial-failure model). */
  errors: Array<{ scope: string; scopeId?: string; code?: string; message: string }>;
}

/**
 * Port for pulling real campaign data from an ad platform.
 *
 * Implementations live in infrastructure and own the HTTP/SDK calls, token
 * resolution, rate-limit handling, and platform-specific field mapping. The
 * application layer depends only on this interface so use-cases stay testable.
 */
export interface IPlatformSyncService {
  /** True when this service can sync the given platform. */
  supports(platform: Platform): boolean;

  /**
   * Fetch the latest metrics for a single campaign from the platform.
   * Returns null when the platform/campaign is not syncable (e.g. no
   * platform_campaign_id yet, or platform unsupported), so the caller can fall
   * back to a metadata-only sync without failing the request.
   */
  syncCampaign(ctx: SyncCampaignContext): Promise<SyncedCampaignMetrics | null>;

  /**
   * Import all campaigns (with metrics) for an account from the platform.
   * Returns null when the account is not syncable (no token / unsupported),
   * so the caller can record a no-op job rather than failing. Collects
   * non-fatal per-campaign errors so one bad campaign does not abort the run.
   */
  syncAccount(ctx: SyncAccountContext): Promise<SyncAccountResult | null>;
}
