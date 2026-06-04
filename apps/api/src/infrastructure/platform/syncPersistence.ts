import { query } from '../database/connection';
import type { SyncedCampaign } from '../../application/ports/IPlatformSyncService';

interface MetricsRow {
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

/**
 * Upsert a per-day `campaign_metrics` row (one row per campaign+date).
 * Idempotent via the UNIQUE(campaign_id, date) constraint so re-syncing the
 * same day overwrites rather than duplicates.
 */
export async function writeCampaignMetrics(
  campaignId: string,
  date: string,
  m: MetricsRow,
): Promise<void> {
  await query(
    `INSERT INTO campaign_metrics (
       campaign_id, date, impressions, clicks, spend, conversions,
       frequency, ctr, cpc, cpm, cpa, roas
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (campaign_id, date) DO UPDATE SET
       impressions = EXCLUDED.impressions,
       clicks = EXCLUDED.clicks,
       spend = EXCLUDED.spend,
       conversions = EXCLUDED.conversions,
       frequency = EXCLUDED.frequency,
       ctr = EXCLUDED.ctr,
       cpc = EXCLUDED.cpc,
       cpm = EXCLUDED.cpm,
       cpa = EXCLUDED.cpa,
       roas = EXCLUDED.roas`,
    [
      campaignId, date, m.impressions, m.clicks, m.spend, m.conversions,
      m.frequency, m.ctr, m.cpc, m.cpm, m.cpa, m.roas,
    ],
  );
}

/** Stamp ad_accounts.last_synced_at to NOW() after a successful account sync. */
export async function stampAccountSynced(adAccountId: string): Promise<void> {
  await query(
    `UPDATE ad_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [adAccountId],
  );
}

export interface AdSetUpsert {
  platformAdSetId: string;
  name: string;
  status: string;
  dailyBudget?: number | null;
  bidStrategy?: string | null;
  bidAmount?: number | null;
  targeting?: Record<string, unknown> | null;
}

export interface AdUpsert {
  platformAdId: string;
  name: string;
  status: string;
  creativeType?: string | null;
  creativeUrl?: string | null;
  creativeText?: string | null;
}

/**
 * Upsert an ad set by (campaign_id, platform_adset_id) and return its internal id.
 * The adsets table has no unique constraint on platform_adset_id, so we do a
 * manual find-then-insert/update keyed by campaign + platform id.
 */
export async function upsertAdSet(
  workspaceId: string,
  campaignId: string,
  platform: string,
  a: AdSetUpsert,
): Promise<string> {
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM adsets WHERE campaign_id = $1 AND platform_adset_id = $2 LIMIT 1`,
    [campaignId, a.platformAdSetId],
  );

  if (existing[0]) {
    await query(
      `UPDATE adsets SET name = $2, status = $3, daily_budget = $4, bid_strategy = $5,
         bid_amount = $6, targeting = $7, updated_at = NOW() WHERE id = $1`,
      [existing[0].id, a.name, a.status, a.dailyBudget ?? null, a.bidStrategy ?? null,
       a.bidAmount ?? null, a.targeting ?? {}],
    );
    return existing[0].id;
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO adsets (workspace_id, campaign_id, platform, platform_adset_id, name,
       status, daily_budget, bid_strategy, bid_amount, targeting)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [workspaceId, campaignId, platform, a.platformAdSetId, a.name, a.status,
     a.dailyBudget ?? null, a.bidStrategy ?? null, a.bidAmount ?? null, a.targeting ?? {}],
  );
  return rows[0].id;
}

/** Upsert an ad by (adset_id, platform_ad_id). */
export async function upsertAd(
  workspaceId: string,
  campaignId: string,
  adsetId: string,
  platform: string,
  ad: AdUpsert,
): Promise<void> {
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM ads WHERE adset_id = $1 AND platform_ad_id = $2 LIMIT 1`,
    [adsetId, ad.platformAdId],
  );

  if (existing[0]) {
    await query(
      `UPDATE ads SET name = $2, status = $3, creative_type = $4, creative_url = $5,
         creative_text = $6, updated_at = NOW() WHERE id = $1`,
      [existing[0].id, ad.name, ad.status, ad.creativeType ?? null, ad.creativeUrl ?? null,
       ad.creativeText ?? null],
    );
    return;
  }

  await query(
    `INSERT INTO ads (workspace_id, campaign_id, adset_id, platform, platform_ad_id,
       name, status, creative_type, creative_url, creative_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [workspaceId, campaignId, adsetId, platform, ad.platformAdId, ad.name, ad.status,
     ad.creativeType ?? null, ad.creativeUrl ?? null, ad.creativeText ?? null],
  );
}

/**
 * Persist all ad sets (and their ads) for one campaign. Returns counts. Used by
 * SyncAccountUseCase when ad-set import is enabled.
 */
export async function writeAdSets(
  workspaceId: string,
  campaignId: string,
  platform: string,
  adSets: NonNullable<SyncedCampaign['adSets']>,
): Promise<{ adSets: number; ads: number }> {
  let adSetCount = 0;
  let adCount = 0;
  for (const as of adSets) {
    const adsetId = await upsertAdSet(workspaceId, campaignId, platform, {
      platformAdSetId: as.platformAdSetId,
      name: as.name,
      status: as.status,
      dailyBudget: as.dailyBudget,
      bidStrategy: as.bidStrategy,
      bidAmount: as.bidAmount,
      targeting: as.targeting,
    });
    adSetCount++;
    for (const ad of as.ads) {
      await upsertAd(workspaceId, campaignId, adsetId, platform, ad);
      adCount++;
    }
  }
  return { adSets: adSetCount, ads: adCount };
}
