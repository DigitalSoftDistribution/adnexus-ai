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
 * Upsert an ad set by (campaign_id, platform_ad_set_id) and return its internal id.
 *
 * Columns match the applied schema (migration 001): `ad_sets` has
 * id/campaign_id/platform_ad_set_id/name/status/budget/targeting only — there is
 * no workspace_id/platform/bid_strategy/bid_amount/daily_budget here. The table
 * has no unique constraint on platform_ad_set_id, so we find-then-insert/update
 * keyed by campaign + platform id.
 */
export async function upsertAdSet(
  campaignId: string,
  a: AdSetUpsert,
): Promise<string> {
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM ad_sets WHERE campaign_id = $1 AND platform_ad_set_id = $2 LIMIT 1`,
    [campaignId, a.platformAdSetId],
  );

  if (existing[0]) {
    await query(
      `UPDATE ad_sets SET name = $2, status = $3, budget = $4, targeting = $5,
         updated_at = NOW() WHERE id = $1`,
      [existing[0].id, a.name, a.status, a.dailyBudget ?? null, a.targeting ?? {}],
    );
    return existing[0].id;
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO ad_sets (campaign_id, platform_ad_set_id, name, status, budget, targeting)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [campaignId, a.platformAdSetId, a.name, a.status, a.dailyBudget ?? null, a.targeting ?? {}],
  );
  return rows[0].id;
}

/**
 * Upsert an ad by (ad_set_id, platform_ad_id).
 *
 * Columns match the applied schema (migration 001): `ads` has
 * id/ad_set_id/campaign_id/platform_ad_id/name/status/creative_type/creative_url/
 * body — no workspace_id/platform/creative_text. The synced creative text maps
 * to `body`.
 */
export async function upsertAd(
  campaignId: string,
  adSetId: string,
  ad: AdUpsert,
): Promise<void> {
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM ads WHERE ad_set_id = $1 AND platform_ad_id = $2 LIMIT 1`,
    [adSetId, ad.platformAdId],
  );

  if (existing[0]) {
    await query(
      `UPDATE ads SET name = $2, status = $3, creative_type = $4, creative_url = $5,
         body = $6, updated_at = NOW() WHERE id = $1`,
      [existing[0].id, ad.name, ad.status, ad.creativeType ?? null, ad.creativeUrl ?? null,
       ad.creativeText ?? null],
    );
    return;
  }

  await query(
    `INSERT INTO ads (campaign_id, ad_set_id, platform_ad_id, name, status,
       creative_type, creative_url, body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [campaignId, adSetId, ad.platformAdId, ad.name, ad.status,
     ad.creativeType ?? null, ad.creativeUrl ?? null, ad.creativeText ?? null],
  );
}

/**
 * Persist all ad sets (and their ads) for one campaign. Returns counts. Used by
 * SyncAccountUseCase when ad-set import is enabled.
 */
export async function writeAdSets(
  _workspaceId: string,
  campaignId: string,
  _platform: string,
  adSets: NonNullable<SyncedCampaign['adSets']>,
): Promise<{ adSets: number; ads: number }> {
  let adSetCount = 0;
  let adCount = 0;
  for (const as of adSets) {
    const adSetId = await upsertAdSet(campaignId, {
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
      await upsertAd(campaignId, adSetId, ad);
      adCount++;
    }
  }
  return { adSets: adSetCount, ads: adCount };
}
