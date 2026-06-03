import type { ICampaignRepository, CampaignFilters, CampaignListResult, CampaignSummary } from '../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../domain/entities/Campaign';
import { query } from '../database/connection';

/**
 * Campaign persistence.
 *
 * IMPORTANT — schema reality: the `campaigns` table does NOT have a
 * `workspace_id` or `platform` column. A campaign belongs to a workspace and a
 * platform indirectly, through `ad_accounts` (campaigns.ad_account_id ->
 * ad_accounts.id, with ad_accounts.workspace_id / ad_accounts.platform).
 * Every workspace- or platform-scoped query therefore JOINs `ad_accounts`,
 * mirroring the v1 routes (apps/api/src/routes/campaigns.ts). Reads project
 * `a.workspace_id AS workspace_id` and `a.platform AS platform` so the returned
 * row still satisfies the Campaign shape the use-cases/frontend expect.
 */
export class CampaignRepository implements ICampaignRepository {
  /** Columns that physically exist on `campaigns` (c.*) — keep in sync with the DB. */
  private static readonly CAMPAIGN_SELECT = `
    c.id, c.ad_account_id, c.platform_campaign_id, c.name, c.status, c.objective,
    c.daily_budget, c.lifetime_budget, c.budget_type, c.spend, c.impressions,
    c.clicks, c.ctr, c.conversions, c.cpa, c.roas, c.frequency, c.reach, c.cpm,
    c.cpc, c.start_date, c.end_date, c.platform_data, c.created_at, c.updated_at,
    a.workspace_id AS workspace_id, a.platform AS platform`;

  async findById(id: string): Promise<Campaign | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT ${CampaignRepository.CAMPAIGN_SELECT}
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE c.id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Campaign | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT ${CampaignRepository.CAMPAIGN_SELECT}
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE c.id = $1 AND a.workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByPlatformCampaignId(platformCampaignId: string): Promise<Campaign | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT ${CampaignRepository.CAMPAIGN_SELECT}
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE c.platform_campaign_id = $1 LIMIT 1`,
      [platformCampaignId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async list(filters: CampaignFilters): Promise<CampaignListResult> {
    // Workspace + platform live on ad_accounts, so scope via the join.
    const conditions: string[] = ['a.workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let paramIdx = 1;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      paramIdx++;
      conditions.push(`c.status = ANY($${paramIdx}::text[])`);
      params.push(statuses);
    }

    if (filters.platform) {
      const platforms = Array.isArray(filters.platform) ? filters.platform : [filters.platform];
      paramIdx++;
      conditions.push(`a.platform = ANY($${paramIdx}::text[])`);
      params.push(platforms);
    }

    if (filters.search) {
      paramIdx++;
      conditions.push(`(c.name ILIKE $${paramIdx} OR c.objective ILIKE $${paramIdx})`);
      params.push(`%${filters.search}%`);
    }

    if (filters.objective) {
      paramIdx++;
      conditions.push(`c.objective = $${paramIdx}`);
      params.push(filters.objective);
    }

    if (filters.dateFrom) {
      paramIdx++;
      conditions.push(`c.start_date >= $${paramIdx}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramIdx++;
      conditions.push(`c.end_date <= $${paramIdx}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = this.getSortColumn(filters.sortBy);
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)
      FROM campaigns c
      JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE ${whereClause}`;
    const { rows: countRows } = await query<{ count: string }>(countQuery, params);
    const total = parseInt(countRows[0].count, 10);

    const dataQuery = `
      SELECT ${CampaignRepository.CAMPAIGN_SELECT}
      FROM campaigns c
      JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${++paramIdx} OFFSET $${++paramIdx}
    `;
    params.push(limit, offset);

    const { rows: campaignRows } = await query<Record<string, unknown>>(dataQuery, params);
    const campaigns = campaignRows.map((r) => this.mapRow(r));

    return {
      campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(workspaceId: string): Promise<CampaignSummary> {
    interface CampaignSummaryRow {
      total_campaigns: number;
      active_count: number;
      paused_count: number;
      total_spend: string | number;
      total_impressions: string | number;
      total_clicks: string | number;
      total_conversions: string | number;
      avg_ctr: string | number;
      avg_cpa: string | number;
      avg_roas: string | number;
      platform_breakdown: Record<string, number> | null;
      status_breakdown: Record<string, number> | null;
    }

    // platform comes from ad_accounts; aggregate the per-(platform|status)
    // counts in a CTE, then roll them into jsonb maps.
    const { rows } = await query<CampaignSummaryRow>(
      `WITH scoped AS (
        SELECT c.status, a.platform, c.spend, c.impressions, c.clicks,
               c.conversions, c.ctr, c.cpa, c.roas
        FROM campaigns c
        JOIN ad_accounts a ON a.id = c.ad_account_id
        WHERE a.workspace_id = $1
      ),
      platform_counts AS (
        SELECT platform, COUNT(*)::int AS cnt FROM scoped
        WHERE platform IS NOT NULL GROUP BY platform
      ),
      status_counts AS (
        SELECT status, COUNT(*)::int AS cnt FROM scoped
        WHERE status IS NOT NULL GROUP BY status
      )
      SELECT
        (SELECT COUNT(*)::int FROM scoped) AS total_campaigns,
        (SELECT COUNT(*)::int FROM scoped WHERE status = 'active') AS active_count,
        (SELECT COUNT(*)::int FROM scoped WHERE status = 'paused') AS paused_count,
        (SELECT COALESCE(SUM(spend), 0) FROM scoped) AS total_spend,
        (SELECT COALESCE(SUM(impressions), 0) FROM scoped) AS total_impressions,
        (SELECT COALESCE(SUM(clicks), 0) FROM scoped) AS total_clicks,
        (SELECT COALESCE(SUM(conversions), 0) FROM scoped) AS total_conversions,
        (SELECT COALESCE(AVG(ctr), 0) FROM scoped) AS avg_ctr,
        (SELECT COALESCE(AVG(cpa), 0) FROM scoped) AS avg_cpa,
        (SELECT COALESCE(AVG(roas), 0) FROM scoped) AS avg_roas,
        (SELECT COALESCE(jsonb_object_agg(platform, cnt), '{}'::jsonb) FROM platform_counts) AS platform_breakdown,
        (SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb) FROM status_counts) AS status_breakdown`,
      [workspaceId],
    );

    const row = rows[0];

    // Trailing 14-day daily series, aggregated across the workspace's campaigns.
    interface SeriesRow {
      date: string;
      spend: string | number;
      impressions: string | number;
      clicks: string | number;
      conversions: string | number;
    }
    const { rows: seriesRows } = await query<SeriesRow>(
      `SELECT to_char(m.date, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(m.spend), 0) AS spend,
              COALESCE(SUM(m.impressions), 0) AS impressions,
              COALESCE(SUM(m.clicks), 0) AS clicks,
              COALESCE(SUM(m.conversions), 0) AS conversions
       FROM campaign_metrics m
       JOIN campaigns c ON c.id = m.campaign_id
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE a.workspace_id = $1
         AND m.date >= (CURRENT_DATE - INTERVAL '13 days')
       GROUP BY m.date
       ORDER BY m.date ASC`,
      [workspaceId],
    );

    return {
      totalCampaigns: row?.total_campaigns ?? 0,
      activeCount: row?.active_count ?? 0,
      pausedCount: row?.paused_count ?? 0,
      totalSpend: Number(row?.total_spend ?? 0),
      totalImpressions: Number(row?.total_impressions ?? 0),
      totalClicks: Number(row?.total_clicks ?? 0),
      totalConversions: Number(row?.total_conversions ?? 0),
      avgCtr: Number(row?.avg_ctr ?? 0),
      avgCpa: Number(row?.avg_cpa ?? 0),
      avgRoas: Number(row?.avg_roas ?? 0),
      platformBreakdown: row?.platform_breakdown ?? {},
      statusBreakdown: row?.status_breakdown ?? {},
      spendSeries: seriesRows.map((s) => ({
        date: s.date,
        spend: Number(s.spend),
        impressions: Number(s.impressions),
        clicks: Number(s.clicks),
        conversions: Number(s.conversions),
      })),
    };
  }

  async create(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    // Insert only columns that exist on `campaigns`. workspace_id/platform are
    // NOT columns here — they belong to the parent ad_account — so they are not
    // inserted. RETURNING re-reads via findById to attach the joined
    // workspace_id/platform the entity shape expects.
    const { rows } = await query<{ id: string }>(
      `INSERT INTO campaigns (
        ad_account_id, platform_campaign_id, name, status, objective,
        budget_type, daily_budget, lifetime_budget, spend, impressions, clicks,
        ctr, conversions, cpa, roas, frequency, cpm, cpc, start_date, end_date,
        platform_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id`,
      [
        campaign.adAccountId, campaign.platformCampaignId, campaign.name, campaign.status,
        campaign.objective, campaign.budgetType, campaign.dailyBudget, campaign.lifetimeBudget,
        campaign.spend, campaign.impressions, campaign.clicks, campaign.ctr, campaign.conversions,
        campaign.cpa, campaign.roas, campaign.frequency, campaign.cpm, campaign.cpc,
        campaign.startDate, campaign.endDate, campaign.platformData,
      ],
    );
    const created = await this.findById(rows[0].id);
    if (!created) throw new Error('Campaign created but could not be re-read');
    return created;
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    // Never attempt to update columns that live on ad_accounts (or don't exist
    // on campaigns): workspace_id, platform, budget, lead_form_id.
    const NON_COLUMN_FIELDS = new Set(['workspaceId', 'platform', 'budget', 'leadFormId', 'id', 'createdAt', 'updatedAt']);
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && !NON_COLUMN_FIELDS.has(key)) {
        const column = this.camelToSnake(key);
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    await query(
      `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = $1`,
      params,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM campaigns WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE a.workspace_id = $1`,
      [workspaceId],
    );
    return parseInt(rows[0].count, 10);
  }

  async countByAdAccount(adAccountId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM campaigns WHERE ad_account_id = $1`,
      [adAccountId],
    );
    return parseInt(rows[0].count, 10);
  }

  private getSortColumn(sortBy?: string): string {
    const columns: Record<string, string> = {
      name: 'c.name',
      status: 'c.status',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
      spend: 'c.spend',
      impressions: 'c.impressions',
      clicks: 'c.clicks',
      ctr: 'c.ctr',
      roas: 'c.roas',
      conversions: 'c.conversions',
    };
    return columns[sortBy ?? ''] ?? 'c.created_at';
  }

  /** Map a snake_case DB row (campaigns c.* + joined a.workspace_id/a.platform)
   * to the camelCase Campaign entity the use-cases/frontend expect. */
  private mapRow(r: Record<string, unknown>): Campaign {
    const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
    const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
    return {
      id: r.id as string,
      workspaceId: (r.workspace_id ?? null) as string,
      adAccountId: (r.ad_account_id ?? null) as string,
      platform: (r.platform ?? null) as Campaign['platform'],
      platformCampaignId: (r.platform_campaign_id ?? null) as string | null,
      name: (r.name ?? '') as string,
      status: (r.status ?? 'draft') as Campaign['status'],
      objective: (r.objective ?? null) as Campaign['objective'],
      budget: (r.budget ?? null) as string | null,
      budgetType: (r.budget_type ?? null) as Campaign['budgetType'],
      dailyBudget: numOrNull(r.daily_budget),
      lifetimeBudget: numOrNull(r.lifetime_budget),
      spend: num(r.spend),
      impressions: num(r.impressions),
      clicks: num(r.clicks),
      ctr: numOrNull(r.ctr),
      conversions: num(r.conversions),
      cpa: numOrNull(r.cpa),
      roas: numOrNull(r.roas),
      frequency: numOrNull(r.frequency),
      cpm: numOrNull(r.cpm),
      cpc: numOrNull(r.cpc),
      startDate: (r.start_date ?? null) as string | null,
      endDate: (r.end_date ?? null) as string | null,
      platformData: (r.platform_data ?? null) as Record<string, unknown> | null,
      leadFormId: (r.lead_form_id ?? null) as string | null,
      createdAt: (r.created_at ?? new Date()) as Date,
      updatedAt: (r.updated_at ?? new Date()) as Date,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
