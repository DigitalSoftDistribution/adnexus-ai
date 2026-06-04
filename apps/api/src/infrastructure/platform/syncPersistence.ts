import { query } from '../database/connection';

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
