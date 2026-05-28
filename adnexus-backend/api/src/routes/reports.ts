import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../lib/errors';
import { getRequestLogger } from '../lib/logger';
import {
  exportReportToExcel,
  exportReportToPDF,
  ExportError,
} from '../services/export-service';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────

function parseDateRange(query: Record<string, unknown>): { start: string; end: string } {
  const end = (query.date_end as string) ?? new Date().toISOString().slice(0, 10);
  const start = (query.date_start as string) ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  return { start, end };
}

function clampPagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt((query.page as string) ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) ?? '20', 10)));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Build a spend chart array from campaign_metrics rows.
 * Aggregated by date → { date, meta, google, tiktok, snap }
 */
async function buildSpendChart(
  workspaceId: string,
  dateStart: string,
  dateEnd: string,
  logger: ReturnType<typeof getRequestLogger>,
) {
  // Get all campaigns for this workspace with their platform
  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, platform')
    .eq('workspace_id', workspaceId);

  if (campErr) {
    logger.error({ error: campErr }, 'Failed to fetch campaigns for spend chart');
    return [];
  }

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  if (campaignIds.length === 0) return [];

  const { data: metrics, error: metErr } = await supabase
    .from('campaign_metrics')
    .select('campaign_id, date, spend')
    .in('campaign_id', campaignIds)
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .order('date', { ascending: true });

  if (metErr) {
    logger.error({ error: metErr }, 'Failed to fetch campaign_metrics for spend chart');
    return [];
  }

  // Build a map: date → { meta, google, tiktok, snap }
  const dateMap = new Map<string, { meta: number; google: number; tiktok: number; snap: number }>();
  const campaignPlatformMap = new Map((campaigns ?? []).map((c) => [c.id, c.platform]));

  for (const row of metrics ?? []) {
    const platform = campaignPlatformMap.get(row.campaign_id) ?? 'unknown';
    const key = row.date as string;
    if (!dateMap.has(key)) {
      dateMap.set(key, { meta: 0, google: 0, tiktok: 0, snap: 0 });
    }
    const bucket = dateMap.get(key)!;
    if (platform === 'meta') bucket.meta += Number(row.spend ?? 0);
    else if (platform === 'google') bucket.google += Number(row.spend ?? 0);
    else if (platform === 'tiktok') bucket.tiktok += Number(row.spend ?? 0);
    else if (platform === 'snap') bucket.snap += Number(row.spend ?? 0);
  }

  return Array.from(dateMap.entries())
    .map(([date, values]) => ({
      date,
      meta: Number(values.meta.toFixed(2)),
      google: Number(values.google.toFixed(2)),
      tiktok: Number(values.tiktok.toFixed(2)),
      snap: Number(values.snap.toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build platform performance summary.
 */
async function buildPlatformPerformance(
  workspaceId: string,
  dateStart: string,
  dateEnd: string,
) {
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, platform')
    .eq('workspace_id', workspaceId);

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  if (campaignIds.length === 0) return [];

  const { data: metrics } = await supabase
    .from('campaign_metrics')
    .select('campaign_id, spend, clicks, impressions, conversions, conversion_value')
    .in('campaign_id', campaignIds)
    .gte('date', dateStart)
    .lte('date', dateEnd);

  const campaignPlatformMap = new Map((campaigns ?? []).map((c) => [c.id, c.platform]));
  const platformMap = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number; convValue: number }>();

  for (const row of metrics ?? []) {
    const platform = campaignPlatformMap.get(row.campaign_id) ?? 'unknown';
    if (!platformMap.has(platform)) {
      platformMap.set(platform, { spend: 0, clicks: 0, impressions: 0, conversions: 0, convValue: 0 });
    }
    const agg = platformMap.get(platform)!;
    agg.spend += Number(row.spend ?? 0);
    agg.clicks += Number(row.clicks ?? 0);
    agg.impressions += Number(row.impressions ?? 0);
    agg.conversions += Number(row.conversions ?? 0);
    agg.convValue += Number(row.conversion_value ?? 0);
  }

  return Array.from(platformMap.entries()).map(([platform, agg]) => ({
    platform,
    spend: Number(agg.spend.toFixed(2)),
    conversions: agg.conversions,
    roas: agg.spend > 0 ? Number((agg.convValue / agg.spend).toFixed(2)) : 0,
    ctr: agg.impressions > 0 ? Number(((agg.clicks / agg.impressions) * 100).toFixed(2)) : 0,
  }));
}

/**
 * Build campaign table for dashboard.
 */
async function buildCampaignTable(workspaceId: string) {
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, platform, status, spend, roas, conversions, impressions, clicks, cpa')
    .eq('workspace_id', workspaceId)
    .order('spend', { ascending: false })
    .limit(20);

  return (campaigns ?? []).map((c) => ({
    name: c.name,
    platform: c.platform,
    status: c.status,
    spend: Number(c.spend ?? 0),
    roas: Number(c.roas ?? 0),
    conversions: Number(c.conversions ?? 0),
  }));
}

/**
 * Generate alerts based on campaign data.
 */
async function buildAlerts(workspaceId: string) {
  const alerts: Array<{ type: string; title: string; message: string; severity: 'info' | 'warning' | 'critical' }> = [];

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('name, status, spend, roas, cpa, ctr, impressions, clicks, conversions')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  for (const c of campaigns ?? []) {
    if (c.roas !== null && Number(c.roas) < 1.5 && Number(c.spend) > 500) {
      alerts.push({
        type: 'low_roas',
        title: `Low ROAS on ${c.name}`,
        message: `ROAS of ${c.roas}x with $${c.spend} spend. Consider reviewing targeting or creative.`,
        severity: 'warning',
      });
    }
    if (c.cpa !== null && Number(c.cpa) > 100) {
      alerts.push({
        type: 'high_cpa',
        title: `High CPA on ${c.name}`,
        message: `CPA of $${c.cpa} exceeds threshold. Review bid strategy or audience.`,
        severity: 'warning',
      });
    }
    if (c.ctr !== null && Number(c.ctr) < 0.5 && Number(c.impressions) > 50000) {
      alerts.push({
        type: 'low_ctr',
        title: `Low CTR on ${c.name}`,
        message: `CTR of ${c.ctr}% after ${c.impressions} impressions. Creative may need refresh.`,
        severity: 'info',
      });
    }
    if (Number(c.spend) > 0 && Number(c.conversions) === 0) {
      alerts.push({
        type: 'no_conversions',
        title: `No conversions on ${c.name}`,
        message: `$${c.spend} spent with zero conversions. Investigate tracking or pause campaign.`,
        severity: 'critical',
      });
    }
  }

  return alerts.slice(0, 10);
}

/**
 * Build recent activity from audit log.
 */
async function buildRecentActivity(workspaceId: string, limit = 10) {
  const { data: logs } = await supabase
    .from('audit_log')
    .select('action, entity_type, entity_id, user_id, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (logs ?? []).map((log) => ({
    action: log.action,
    entity: log.entity_type,
    entity_id: log.entity_id,
    user: log.user_id ? 'User' : 'System',
    timestamp: log.created_at,
  }));
}

/**
 * Generate report data from campaign_metrics based on type and filters.
 */
async function generateReportData(
  workspaceId: string,
  type: string,
  dateRange: { start: string; end: string },
  platforms?: string[],
  campaignIds?: string[],
  logger?: ReturnType<typeof getRequestLogger>,
) {
  // Resolve campaign IDs scoped to workspace + platforms
  let query = supabase
    .from('campaigns')
    .select('id, name, platform, status')
    .eq('workspace_id', workspaceId);

  if (platforms && platforms.length > 0) {
    query = query.in('platform', platforms);
  }
  if (campaignIds && campaignIds.length > 0) {
    query = query.in('id', campaignIds);
  }

  const { data: campaigns, error: cErr } = await query;
  if (cErr || !campaigns || campaigns.length === 0) {
    logger?.warn('No campaigns found for report criteria');
    return { summary: {}, campaigns: [], creatives: [] };
  }

  const ids = campaigns.map((c) => c.id);
  const campMap = new Map(campaigns.map((c) => [c.id, c]));

  // Fetch metrics
  const { data: metrics } = await supabase
    .from('campaign_metrics')
    .select('*')
    .in('campaign_id', ids)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  // Aggregate per-campaign
  const aggMap = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; convValue: number; reach: number }>();
  for (const m of metrics ?? []) {
    const key = m.campaign_id as string;
    if (!aggMap.has(key)) {
      aggMap.set(key, { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0, reach: 0 });
    }
    const a = aggMap.get(key)!;
    a.spend += Number(m.spend ?? 0);
    a.impressions += Number(m.impressions ?? 0);
    a.clicks += Number(m.clicks ?? 0);
    a.conversions += Number(m.conversions ?? 0);
    a.convValue += Number(m.conversion_value ?? 0);
    a.reach += Number(m.reach ?? 0);
  }

  const campaignRows = campaigns.map((c) => {
    const a = aggMap.get(c.id) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0, reach: 0 };
    return {
      id: c.id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      spend: Number(a.spend.toFixed(2)),
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      ctr: a.impressions > 0 ? Number(((a.clicks / a.impressions) * 100).toFixed(2)) : 0,
      cpc: a.clicks > 0 ? Number((a.spend / a.clicks).toFixed(2)) : 0,
      cpa: a.conversions > 0 ? Number((a.spend / a.conversions).toFixed(2)) : 0,
      roas: a.spend > 0 ? Number((a.convValue / a.spend).toFixed(2)) : 0,
      reach: a.reach,
    };
  });

  // Summary KPIs
  const totalSpend = campaignRows.reduce((s, c) => s + c.spend, 0);
  const totalConvValue = campaignRows.reduce((s, c) => s + c.conversions * (c.roas > 0 ? c.spend / c.conversions * c.roas : 0), 0);
  const totalConversions = campaignRows.reduce((s, c) => s + c.conversions, 0);
  const totalImpressions = campaignRows.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaignRows.reduce((s, c) => s + c.clicks, 0);

  const summary = {
    totalSpend: Number(totalSpend.toFixed(2)),
    totalROAS: totalSpend > 0 ? Number((totalConvValue / totalSpend).toFixed(2)) : 0,
    totalConversions,
    totalCTR: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    totalCPA: totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0,
  };

  // Creative performance (for creative/audience type reports)
  let creativeRows: Array<Record<string, unknown>> = [];
  if (type === 'creative' || type === 'audience') {
    const { data: ads } = await supabase
      .from('ads')
      .select('id, campaign_id, name, creative_type, status, spend, impressions, clicks, conversions, fatigue_score, fatigue_status')
      .in('campaign_id', ids);

    const adIds = (ads ?? []).map((a) => a.id);
    if (adIds.length > 0) {
      const { data: creativeMetrics } = await supabase
        .from('creative_performance')
        .select('ad_id, impressions, clicks, ctr, cpc, fatigue_score, performance_trend')
        .in('ad_id', adIds)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Aggregate per ad
      const creativeAgg = new Map<string, { impressions: number; clicks: number; fatigue: number; count: number }>();
      for (const cm of creativeMetrics ?? []) {
        const key = cm.ad_id as string;
        if (!creativeAgg.has(key)) {
          creativeAgg.set(key, { impressions: 0, clicks: 0, fatigue: 0, count: 0 });
        }
        const ca = creativeAgg.get(key)!;
        ca.impressions += Number(cm.impressions ?? 0);
        ca.clicks += Number(cm.clicks ?? 0);
        ca.fatigue += Number(cm.fatigue_score ?? 0);
        ca.count += 1;
      }

      creativeRows = (ads ?? []).map((ad) => {
        const ca = creativeAgg.get(ad.id);
        return {
          id: ad.id,
          name: ad.name,
          campaign: campMap.get(ad.campaign_id)?.name ?? '',
          campaign_id: ad.campaign_id,
          creative_type: ad.creative_type,
          status: ad.status,
          fatigue_score: ad.fatigue_score ?? (ca ? Math.round(ca.fatigue / ca.count) : 0),
          fatigue_status: ad.fatigue_status,
          impressions: ca?.impressions ?? Number(ad.impressions ?? 0),
          clicks: ca?.clicks ?? Number(ad.clicks ?? 0),
          ctr: ca && ca.impressions > 0 ? Number(((ca.clicks / ca.impressions) * 100).toFixed(2)) : (Number(ad.clicks ?? 0) > 0 ? Number(((Number(ad.clicks ?? 0) / Number(ad.impressions ?? 1)) * 100).toFixed(2)) : 0),
          spend: Number(ad.spend ?? 0),
        };
      });
    }
  }

  // Daily breakdown for trend
  const dateAgg = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; convValue: number }>();
  for (const m of metrics ?? []) {
    const d = m.date as string;
    if (!dateAgg.has(d)) {
      dateAgg.set(d, { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 });
    }
    const da = dateAgg.get(d)!;
    da.spend += Number(m.spend ?? 0);
    da.impressions += Number(m.impressions ?? 0);
    da.clicks += Number(m.clicks ?? 0);
    da.conversions += Number(m.conversions ?? 0);
    da.convValue += Number(m.conversion_value ?? 0);
  }

  const dailyTrend = Array.from(dateAgg.entries())
    .map(([date, a]) => ({
      date,
      spend: Number(a.spend.toFixed(2)),
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      roas: a.spend > 0 ? Number((a.convValue / a.spend).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary,
    campaigns: campaignRows,
    creatives: creativeRows,
    dailyTrend,
  };
}

// ═══════════════════════════════════════════════════════════════
//  REPORT TEMPLATES (static — must come before /:id)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/templates',
  asyncHandler(async (_req, res) => {
    const templates = [
      {
        id: 'performance-summary',
        name: 'Performance Summary',
        description: 'Overview of campaign performance across all platforms including KPIs, trends, and platform breakdowns.',
        type: 'performance',
        default_metrics: ['spend', 'impressions', 'clicks', 'conversions', 'roas', 'cpa', 'ctr'],
        default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'], status: ['active'] },
      },
      {
        id: 'creative-analysis',
        name: 'Creative Analysis',
        description: 'Analyze creative performance, fatigue scores, and CTR trends to identify winning and exhausted ads.',
        type: 'creative',
        default_metrics: ['impressions', 'clicks', 'ctr', 'fatigue_score', 'spend', 'conversions'],
        default_filters: { creative_types: ['image', 'video', 'carousel'] },
      },
      {
        id: 'budget-review',
        name: 'Budget Review',
        description: 'Track budget utilization, pacing, and efficiency metrics across campaigns and platforms.',
        type: 'budget',
        default_metrics: ['spend', 'budget', 'pacing_pct', 'roas', 'cpa', 'conversions'],
        default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'] },
      },
      {
        id: 'cross-platform-comparison',
        name: 'Cross-Platform Comparison',
        description: 'Compare performance side-by-side across Meta, Google, TikTok, and Snap with normalized metrics.',
        type: 'performance',
        default_metrics: ['spend', 'roas', 'ctr', 'cpa', 'conversions', 'impressions'],
        default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'] },
      },
    ];

    res.json({ success: true, data: templates });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD (must come before /:id)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const correlationId = (req.headers['x-request-id'] as string) ?? 'unknown';
    const logger = getRequestLogger(correlationId, { path: req.originalUrl, method: req.method });
    const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) ?? '30', 10)));
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    logger.info({ workspaceId, days, dateStart, dateEnd }, 'Building dashboard data');

    // ── KPIs: aggregate from campaign_metrics ──
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, platform')
      .eq('workspace_id', workspaceId);

    const campaignIds = (campaigns ?? []).map((c) => c.id);
    let kpis = { totalSpend: 0, totalROAS: 0, totalConversions: 0, totalCTR: 0, totalCPA: 0 };

    if (campaignIds.length > 0) {
      const { data: metricsAgg } = await supabase
        .from('campaign_metrics')
        .select('spend, clicks, impressions, conversions, conversion_value')
        .in('campaign_id', campaignIds)
        .gte('date', dateStart)
        .lte('date', dateEnd);

      let totalSpend = 0;
      let totalConvValue = 0;
      let totalConversions = 0;
      let totalImpressions = 0;
      let totalClicks = 0;

      for (const row of metricsAgg ?? []) {
        totalSpend += Number(row.spend ?? 0);
        totalConvValue += Number(row.conversion_value ?? 0);
        totalConversions += Number(row.conversions ?? 0);
        totalImpressions += Number(row.impressions ?? 0);
        totalClicks += Number(row.clicks ?? 0);
      }

      kpis = {
        totalSpend: Number(totalSpend.toFixed(2)),
        totalROAS: totalSpend > 0 ? Number((totalConvValue / totalSpend).toFixed(2)) : 0,
        totalConversions,
        totalCTR: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        totalCPA: totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0,
      };
    }

    // ── Spend chart ──
    const spendChart = await buildSpendChart(workspaceId, dateStart, dateEnd, logger);

    // ── Platform performance ──
    const platformPerformance = await buildPlatformPerformance(workspaceId, dateStart, dateEnd);

    // ── Campaign table ──
    const campaignTable = await buildCampaignTable(workspaceId);

    // ── Alerts ──
    const alerts = await buildAlerts(workspaceId);

    // ── Recent activity ──
    const recentActivity = await buildRecentActivity(workspaceId);

    res.json({
      success: true,
      data: {
        kpis,
        spendChart,
        platformPerformance,
        campaignTable,
        alerts,
        recentActivity,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  GENERATE ON-DEMAND REPORT (must come before /:id)
// ═══════════════════════════════════════════════════════════════

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const correlationId = (req.headers['x-request-id'] as string) ?? 'unknown';
    const logger = getRequestLogger(correlationId, { path: req.originalUrl, method: req.method });

    const schema = z.object({
      type: z.enum(['performance', 'creative', 'audience', 'budget']),
      dateRange: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      platforms: z.array(z.enum(['meta', 'google', 'tiktok', 'snap'])).optional(),
      campaigns: z.array(z.string().uuid()).optional(),
    });

    const body = schema.parse(req.body);
    logger.info({ type: body.type, dateRange: body.dateRange }, 'Generating on-demand report');

    const reportData = await generateReportData(
      workspaceId,
      body.type,
      body.dateRange,
      body.platforms,
      body.campaigns,
      logger,
    );

    const { campaigns: _reportCampaigns, ...reportContent } = reportData;
    res.json({
      success: true,
      data: {
        type: body.type,
        dateRange: body.dateRange,
        platforms: body.platforms ?? ['meta', 'google', 'tiktok', 'snap'],
        campaigns: body.campaigns ?? [],
        generated_at: new Date().toISOString(),
        ...reportContent,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  SCHEDULED REPORTS
// ═══════════════════════════════════════════════════════════════

// List scheduled reports
router.get(
  '/scheduled',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch scheduled reports: ${error.message}`);

    // Compute next_run_at if missing
    const now = new Date();
    const enriched = (data ?? []).map((row) => {
      let nextRun = row.next_run_at;
      if (!nextRun && row.schedule_cron) {
        // Simple heuristic: daily → +1 day, weekly → +7 days, monthly → +30 days
        const created = new Date(row.created_at);
        const diff = now.getTime() - created.getTime();
        if (row.schedule_cron.includes('daily')) {
          nextRun = new Date(now.getTime() + 86400000).toISOString();
        } else if (row.schedule_cron.includes('weekly')) {
          nextRun = new Date(now.getTime() + 7 * 86400000).toISOString();
        } else {
          nextRun = new Date(now.getTime() + 30 * 86400000).toISOString();
        }
      }
      return { ...row, next_run_at: nextRun };
    });

    res.json({ success: true, data: enriched });
  }),
);

// Schedule a recurring report
router.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      name: z.string().min(1).max(255),
      type: z.string().min(1),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      email: z.string().email(),
      platforms: z.array(z.enum(['meta', 'google', 'tiktok', 'snap'])).optional(),
    });

    const body = schema.parse(req.body);

    // Map frequency to cron expression
    const cronMap = {
      daily: '0 9 * * *',
      weekly: '0 9 * * 1',
      monthly: '0 9 1 * *',
    };

    const config: Record<string, unknown> = {
      platforms: body.platforms ?? ['meta', 'google', 'tiktok', 'snap'],
      email: body.email,
      frequency: body.frequency,
    };

    const nextRun = new Date();
    if (body.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
    else if (body.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    else nextRun.setMonth(nextRun.getMonth() + 1);

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        workspace_id: workspaceId,
        name: body.name,
        type: body.type,
        config,
        schedule_cron: cronMap[body.frequency],
        status: 'active',
        next_run_at: nextRun.toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new ValidationError(`Failed to schedule report: ${error?.message ?? 'unknown'}`);
    }

    res.status(201).json({
      success: true,
      data,
      message: `Report scheduled to run ${body.frequency}`,
    });
  }),
);

// Cancel scheduled report
router.delete(
  '/schedule/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update({ status: 'paused' })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Scheduled report');

    res.json({ success: true, data, message: 'Scheduled report cancelled' });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  CRUD: SAVED REPORTS
// ═══════════════════════════════════════════════════════════════

// GET /reports — List saved reports (stored in report_results)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { page, limit, offset } = clampPagination(req.query);

    const { data, error, count } = await supabase
      .from('report_results')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch reports: ${error.message}`);

    res.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  }),
);

// POST /reports — Create and save a report
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const correlationId = (req.headers['x-request-id'] as string) ?? 'unknown';
    const logger = getRequestLogger(correlationId, { path: req.originalUrl, method: req.method });

    const schema = z.object({
      name: z.string().min(1).max(255),
      type: z.enum(['performance', 'creative', 'audience', 'budget']),
      dateRange: z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      platforms: z.array(z.enum(['meta', 'google', 'tiktok', 'snap'])).optional(),
      metrics: z.array(z.string()).optional(),
      filters: z.record(z.unknown()).optional(),
    });

    const body = schema.parse(req.body);
    logger.info({ name: body.name, type: body.type }, 'Creating report');

    // Generate report data
    const reportData = await generateReportData(
      workspaceId,
      body.type,
      body.dateRange,
      body.platforms,
      undefined,
      logger,
    );

    // Save to report_results
    const content: Record<string, unknown> = {
      name: body.name,
      type: body.type,
      date_range: body.dateRange,
      platforms: body.platforms ?? ['meta', 'google', 'tiktok', 'snap'],
      metrics: body.metrics,
      filters: body.filters,
      data: reportData,
      created_by: req.user?.sub ?? null,
    };

    const { data: saved, error: saveErr } = await supabase
      .from('report_results')
      .insert({
        workspace_id: workspaceId,
        scheduled_report_id: null, // ad-hoc report
        content,
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveErr || !saved) {
      throw new ValidationError(`Failed to save report: ${saveErr?.message ?? 'unknown'}`);
    }

    res.status(201).json({
      success: true,
      data: {
        report: saved,
        data: reportData,
      },
    });
  }),
);

// GET /reports/:id — Get a saved report with all data
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('report_results')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) throw new NotFoundError('Report');

    res.json({ success: true, data });
  }),
);

// DELETE /reports/:id — Delete a saved report
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('report_results')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Report');

    res.json({ success: true, data, message: 'Report deleted' });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  EXPORT REPORT — CSV, Excel, PDF generation
// ═══════════════════════════════════════════════════════════════

router.post(
  '/:id/export',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;
    const format = (req.query.format as string) ?? 'csv';
    const validFormats = ['pdf', 'csv', 'xlsx'];

    if (!validFormats.includes(format)) {
      throw new ValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Fetch the full report with content
    const { data: report, error } = await supabase
      .from('report_results')
      .select('id, content, created_at, status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !report) throw new NotFoundError('Report');

    const reportName = report.content?.name || `report-${id}`;

    try {
      if (format === 'csv') {
        // ── CSV: generate flat CSV from campaign rows ──
        const campaigns = report.content?.campaigns || report.content?.data?.campaigns || [];
        if (!campaigns || campaigns.length === 0) {
          throw new ValidationError('No campaign data to export');
        }

        const headers = Object.keys(campaigns[0]).filter((k) => k !== 'id');
        const csvLines = [
          headers.join(','),
          ...campaigns.map((row: Record<string, unknown>) =>
            headers
              .map((h) => {
                const val = row[h];
                if (val == null) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
              })
              .join(',')
          ),
        ];

        const csv = '\uFEFF' + csvLines.join('\n');
        const filename = `${reportName}-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        return;
      }

      if (format === 'xlsx') {
        // ── Excel: multi-sheet workbook ──
        const { buffer, filename } = await exportReportToExcel(report, {
          template: req.query.template as string | undefined,
        });

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
        return;
      }

      if (format === 'pdf') {
        // ── PDF: return printable HTML (browser converts to PDF) ──
        const { buffer: html, filename } = await exportReportToPDF(report, {
          title: req.query.title as string | undefined,
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);
        return;
      }
    } catch (err) {
      if (err instanceof ExportError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  }),
);

// ═══════════════════════════════════════════════════════════════
//  LEGACY / ADDITIONAL REPORT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /reports/cross-platform
router.get(
  '/cross-platform',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const dateStart = (req.query.date_start as string) ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateEnd = (req.query.date_end as string) ?? new Date().toISOString().slice(0, 10);

    const platformPerf = await buildPlatformPerformance(workspaceId, dateStart, dateEnd);

    res.json({
      success: true,
      data: {
        date_range: { start: dateStart, end: dateEnd },
        platforms: platformPerf,
      },
    });
  }),
);

// GET /reports/funnel
router.get(
  '/funnel',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { start, end } = parseDateRange(req.query);

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('workspace_id', workspaceId);

    const ids = (campaigns ?? []).map((c) => c.id);
    let agg = { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 };

    if (ids.length > 0) {
      const { data: metrics } = await supabase
        .from('campaign_metrics')
        .select('impressions, clicks, conversions, conversion_value, spend')
        .in('campaign_id', ids)
        .gte('date', start)
        .lte('date', end);

      for (const m of metrics ?? []) {
        agg.impressions += Number(m.impressions ?? 0);
        agg.clicks += Number(m.clicks ?? 0);
        agg.conversions += Number(m.conversions ?? 0);
        agg.revenue += Number(m.conversion_value ?? 0);
        agg.spend += Number(m.spend ?? 0);
      }
    }

    res.json({
      success: true,
      data: {
        date_range: { start, end },
        stages: [
          { name: 'Impressions', value: agg.impressions },
          { name: 'Clicks', value: agg.clicks, rate: agg.impressions > 0 ? ((agg.clicks / agg.impressions) * 100).toFixed(2) + '%' : '0%' },
          { name: 'Conversions', value: agg.conversions, rate: agg.clicks > 0 ? ((agg.conversions / agg.clicks) * 100).toFixed(2) + '%' : '0%' },
          { name: 'Revenue', value: '$' + agg.revenue.toLocaleString() },
        ],
        summary: {
          total_spend: Number(agg.spend.toFixed(2)),
          total_revenue: Number(agg.revenue.toFixed(2)),
          roas: agg.spend > 0 ? Number((agg.revenue / agg.spend).toFixed(2)) : 0,
        },
      },
    });
  }),
);

export default router;
