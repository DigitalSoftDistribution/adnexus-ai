import type { ICampaignRepository, CampaignFilters, CampaignListResult, CampaignSummary } from '../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../domain/entities/Campaign';
import { query } from '../database/connection';

export class CampaignRepository implements ICampaignRepository {
  async findById(id: string): Promise<Campaign | null> {
    const { rows } = await query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Campaign | null> {
    const { rows } = await query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async findByPlatformCampaignId(platformCampaignId: string): Promise<Campaign | null> {
    const { rows } = await query<Campaign>(
      `SELECT * FROM campaigns WHERE platform_campaign_id = $1 LIMIT 1`,
      [platformCampaignId],
    );
    return rows[0] ?? null;
  }

  async list(filters: CampaignFilters): Promise<CampaignListResult> {
    const conditions: string[] = ['c.workspace_id = $1'];
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
      conditions.push(`c.platform = ANY($${paramIdx}::text[])`);
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

    const countQuery = `SELECT COUNT(*) FROM campaigns c WHERE ${whereClause}`;
    const { rows: countRows } = await query<{ count: string }>(countQuery, params);
    const total = parseInt(countRows[0].count, 10);

    const dataQuery = `
      SELECT c.*, a.platform as account_platform
      FROM campaigns c
      JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${++paramIdx} OFFSET $${++paramIdx}
    `;
    params.push(limit, offset);

    const { rows: campaigns } = await query<Campaign>(dataQuery, params);

    return {
      campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(workspaceId: string): Promise<CampaignSummary> {
    const { rows } = await query<CampaignSummary>(
      `SELECT
        COUNT(*)::int as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_count,
        COUNT(*) FILTER (WHERE status = 'paused')::int as paused_count,
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(conversions), 0) as total_conversions,
        COALESCE(AVG(ctr), 0) as avg_ctr,
        COALESCE(AVG(cpa), 0) as avg_cpa,
        COALESCE(AVG(roas), 0) as avg_roas,
        jsonb_object_agg(platform, cnt) FILTER (WHERE platform IS NOT NULL) as platform_breakdown,
        jsonb_object_agg(status, cnt) FILTER (WHERE status IS NOT NULL) as status_breakdown
      FROM campaigns
      WHERE workspace_id = $1`,
      [workspaceId],
    );

    const row = rows[0];
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
    };
  }

  async create(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const { rows } = await query<Campaign>(
      `INSERT INTO campaigns (
        workspace_id, ad_account_id, platform, platform_campaign_id, name,
        status, objective, budget, budget_type, daily_budget, lifetime_budget,
        spend, impressions, clicks, ctr, conversions, cpa, roas, frequency,
        cpm, cpc, start_date, end_date, platform_data, lead_form_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        campaign.workspaceId, campaign.adAccountId, campaign.platform, campaign.platformCampaignId,
        campaign.name, campaign.status, campaign.objective, campaign.budget, campaign.budgetType,
        campaign.dailyBudget, campaign.lifetimeBudget, campaign.spend, campaign.impressions,
        campaign.clicks, campaign.ctr, campaign.conversions, campaign.cpa, campaign.roas,
        campaign.frequency, campaign.cpm, campaign.cpc, campaign.startDate, campaign.endDate,
        campaign.platformData, campaign.leadFormId,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = this.camelToSnake(key);
        setClauses.push(`${column} = $${++idx}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Campaign>(
      `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM campaigns WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM campaigns WHERE workspace_id = $1`,
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

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
