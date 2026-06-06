import type { IReportRepository, Report, ReportFilters, ReportListResult } from '../../domain/repositories/IReportRepository';
import { query } from '../database/connection';

export class ReportRepository implements IReportRepository {
  private static readonly REPORT_SELECT = `
    id,
    workspace_id AS "workspaceId",
    name,
    type,
    config,
    schedule,
    last_run_at AS "lastRunAt",
    created_at AS "createdAt",
    updated_at AS "updatedAt"`;

  async list(filters: ReportFilters): Promise<ReportListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.type) {
      conditions.push(`type = $${++idx}`);
      params.push(filters.type);
    }

    const where = conditions.join(' AND ');

    const { rows } = await query<Report>(
      `SELECT ${ReportRepository.REPORT_SELECT}
         FROM reports
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM reports WHERE ${where}`,
      params,
    );

    return {
      reports: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Report | null> {
    const { rows } = await query<Report>(
      `SELECT ${ReportRepository.REPORT_SELECT} FROM reports WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Report | null> {
    const { rows } = await query<Report>(
      `SELECT ${ReportRepository.REPORT_SELECT} FROM reports WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const { rows } = await query<Report>(
      `INSERT INTO reports (workspace_id, name, type, config, schedule, last_run_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${ReportRepository.REPORT_SELECT}`,
      [
        report.workspaceId, report.name, report.type,
        JSON.stringify(report.config),
        report.schedule ? JSON.stringify(report.schedule) : null,
        report.lastRunAt,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Report>): Promise<Report | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${++idx}`);
      params.push(updates.name);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${++idx}`);
      params.push(updates.type);
    }
    if (updates.config !== undefined) {
      setClauses.push(`config = $${++idx}`);
      params.push(JSON.stringify(updates.config));
    }
    if (updates.schedule !== undefined) {
      setClauses.push(`schedule = $${++idx}`);
      params.push(updates.schedule ? JSON.stringify(updates.schedule) : null);
    }
    if (updates.lastRunAt !== undefined) {
      setClauses.push(`last_run_at = $${++idx}`);
      params.push(updates.lastRunAt);
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Report>(
      `UPDATE reports SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING ${ReportRepository.REPORT_SELECT}`,
      params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM reports WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async runReport(reportId: string): Promise<Record<string, unknown>> {
    const report = await this.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const config = (report.config ?? {}) as {
      dateRange?: { start?: string; end?: string };
      platforms?: string[];
      campaignIds?: string[];
    };

    const dateEnd = config.dateRange?.end ?? new Date().toISOString().slice(0, 10);
    const dateStart = config.dateRange?.start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const params: unknown[] = [report.workspaceId, dateStart, dateEnd];
    const conditions = [
      'a.workspace_id = $1',
      'm.date >= $2',
      'm.date <= $3',
    ];
    let idx = 3;

    if (config.platforms && config.platforms.length > 0) {
      conditions.push(`a.platform = ANY($${++idx}::text[])`);
      params.push(config.platforms);
    }

    if (config.campaignIds && config.campaignIds.length > 0) {
      conditions.push(`c.id = ANY($${++idx}::uuid[])`);
      params.push(config.campaignIds);
    }

    const { rows } = await query<{
      campaign_id: string;
      campaign_name: string;
      platform: string;
      spend: string | number | null;
      impressions: string | number | null;
      clicks: string | number | null;
      conversions: string | number | null;
      conversion_value: string | number | null;
    }>(
      `SELECT c.id AS campaign_id,
              c.name AS campaign_name,
              a.platform,
              COALESCE(SUM(m.spend), 0) AS spend,
              COALESCE(SUM(m.impressions), 0) AS impressions,
              COALESCE(SUM(m.clicks), 0) AS clicks,
              COALESCE(SUM(m.conversions), 0) AS conversions,
              COALESCE(SUM(m.conversion_value), 0) AS conversion_value
         FROM campaigns c
         JOIN ad_accounts a ON a.id = c.ad_account_id
         LEFT JOIN campaign_metrics m ON m.campaign_id = c.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY c.id, c.name, a.platform
        ORDER BY spend DESC
        LIMIT 100`,
      params,
    );

    const campaigns = rows.map((row) => {
      const spend = Number(row.spend ?? 0);
      const impressions = Number(row.impressions ?? 0);
      const clicks = Number(row.clicks ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const conversionValue = Number(row.conversion_value ?? 0);

      return {
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        platform: row.platform,
        spend: Number(spend.toFixed(2)),
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
        roas: spend > 0 ? Number((conversionValue / spend).toFixed(2)) : 0,
      };
    });

    const summary = campaigns.reduce(
      (acc, row) => {
        acc.totalSpend += row.spend;
        acc.totalImpressions += row.impressions;
        acc.totalClicks += row.clicks;
        acc.totalConversions += row.conversions;
        return acc;
      },
      { totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0 },
    );

    await this.update(reportId, { lastRunAt: new Date() });

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      dateRange: { start: dateStart, end: dateEnd },
      summary: {
        ...summary,
        totalSpend: Number(summary.totalSpend.toFixed(2)),
        totalCtr: summary.totalImpressions > 0
          ? Number(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2))
          : 0,
      },
      campaigns,
      message: campaigns.length === 0
        ? 'No campaign metrics found for the selected criteria.'
        : null,
    };
  }
}
