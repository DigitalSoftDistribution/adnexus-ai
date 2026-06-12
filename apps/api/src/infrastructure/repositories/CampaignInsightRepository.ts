import type { ICampaignInsightRepository } from '../../domain/repositories/ICampaignInsightRepository';
import type { CampaignInsight, CampaignInsightSummary } from '../../domain/entities/CampaignInsight';
import { query } from '../database/connection';

/** Per-day performance rows live in `campaign_metrics` (not `campaign_insights`). */
const METRICS_TABLE = 'campaign_metrics';

function mapRow(r: Record<string, unknown>): CampaignInsight {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    date: String(r.date),
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: r.ctr != null ? Number(r.ctr) : null,
    conversions: Number(r.conversions ?? 0),
    cpa: r.cpa != null ? Number(r.cpa) : null,
    roas: r.roas != null ? Number(r.roas) : null,
    cpm: r.cpm != null ? Number(r.cpm) : null,
    cpc: r.cpc != null ? Number(r.cpc) : null,
    frequency: r.frequency != null ? Number(r.frequency) : null,
    reach: r.reach != null ? Number(r.reach) : null,
    createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at ?? Date.now())),
  };
}

export class CampaignInsightRepository implements ICampaignInsightRepository {
  async getDailyBreakdown(campaignId: string, dateFrom?: string, dateTo?: string): Promise<CampaignInsight[]> {
    const conditions: string[] = ['campaign_id = $1'];
    const params: unknown[] = [campaignId];
    let idx = 1;

    if (dateFrom) {
      idx++;
      conditions.push(`date >= $${idx}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      idx++;
      conditions.push(`date <= $${idx}`);
      params.push(dateTo);
    }

    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ${METRICS_TABLE}
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC`,
      params,
    );

    return rows.map(mapRow);
  }

  async getSummary(campaignId: string, dateFrom?: string, dateTo?: string): Promise<CampaignInsightSummary> {
    const conditions: string[] = ['campaign_id = $1'];
    const params: unknown[] = [campaignId];
    let idx = 1;

    if (dateFrom) {
      idx++;
      conditions.push(`date >= $${idx}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      idx++;
      conditions.push(`date <= $${idx}`);
      params.push(dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const { rows: aggRows } = await query<{
      total_spend: string | number;
      total_impressions: string | number;
      total_clicks: string | number;
      total_conversions: string | number;
      avg_ctr: string | number;
      avg_cpa: string | number;
      avg_roas: string | number;
      avg_cpm: string | number;
      avg_cpc: string | number;
    }>(
      `SELECT
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(conversions), 0) as total_conversions,
        COALESCE(AVG(ctr), 0) as avg_ctr,
        COALESCE(AVG(cpa), 0) as avg_cpa,
        COALESCE(AVG(roas), 0) as avg_roas,
        COALESCE(AVG(cpm), 0) as avg_cpm,
        COALESCE(AVG(cpc), 0) as avg_cpc
      FROM ${METRICS_TABLE}
      WHERE ${whereClause}`,
      params,
    );

    const { rows: dailyRows } = await query<Record<string, unknown>>(
      `SELECT * FROM ${METRICS_TABLE}
       WHERE ${whereClause}
       ORDER BY date DESC
       LIMIT 30`,
      params,
    );

    const agg = aggRows[0];

    return {
      campaignId,
      totalSpend: Number(agg?.total_spend ?? 0),
      totalImpressions: Number(agg?.total_impressions ?? 0),
      totalClicks: Number(agg?.total_clicks ?? 0),
      totalConversions: Number(agg?.total_conversions ?? 0),
      avgCtr: Number(agg?.avg_ctr ?? 0),
      avgCpa: Number(agg?.avg_cpa ?? 0),
      avgRoas: Number(agg?.avg_roas ?? 0),
      avgCpm: Number(agg?.avg_cpm ?? 0),
      avgCpc: Number(agg?.avg_cpc ?? 0),
      dailyBreakdown: dailyRows.map(mapRow),
      platformBreakdown: {},
    };
  }

  async create(insight: Omit<CampaignInsight, 'id' | 'createdAt'>): Promise<CampaignInsight> {
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO ${METRICS_TABLE} (
        campaign_id, date, spend, impressions, clicks, ctr,
        conversions, cpa, roas, cpm, cpc, frequency, reach
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (campaign_id, date) DO UPDATE SET
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        ctr = EXCLUDED.ctr,
        conversions = EXCLUDED.conversions,
        cpa = EXCLUDED.cpa,
        roas = EXCLUDED.roas,
        cpm = EXCLUDED.cpm,
        cpc = EXCLUDED.cpc,
        frequency = EXCLUDED.frequency,
        reach = EXCLUDED.reach
      RETURNING *`,
      [
        insight.campaignId, insight.date, insight.spend, insight.impressions,
        insight.clicks, insight.ctr, insight.conversions, insight.cpa,
        insight.roas, insight.cpm, insight.cpc, insight.frequency, insight.reach,
      ],
    );
    return mapRow(rows[0]);
  }
}
