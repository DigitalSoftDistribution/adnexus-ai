import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/connection';
import { ValidationError, NotFoundError } from '../lib/errors';
import { assertCampaignQuota } from '../services/plan-limits';
import { asyncHandler } from '../middleware/errorHandler';
import { requireRole } from '../middleware/authenticate';
import { createDraft } from '../services/drafts-service';
import type { UnifiedCampaign, CampaignStatus, DraftType, Platform } from '../types';

// RBAC for campaign mutations. In the v1 role model the mutation-capable
// mid-tier role is `analyst` (v2's equivalent is `editor`); viewers and
// non-members get a 403 before any request-body validation runs.
//   - create / update / pause / resume / duplicate → owner, admin, analyst
//   - delete → owner, admin only (matches v2 DeleteCampaignUseCase, which
//     denies the mid-tier role for destructive ops)
const requireMutator = requireRole('owner', 'admin', 'analyst');
const requireAdmin = requireRole('owner', 'admin');

const router = Router();

// ─── Allowed sort columns (whitelist for SQL ordering) ───────

const SORTABLE_COLUMNS: Record<string, string> = {
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

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Resolve the platform for an ad account so we can tag the draft
 * with the correct platform value.
 */
async function getAdAccountPlatform(
  adAccountId: string,
  workspaceId: string,
): Promise<Platform> {
  const { rows } = await query<{ platform: Platform }>(
    `SELECT platform FROM ad_accounts
      WHERE id = $1 AND workspace_id = $2
      LIMIT 1`,
    [adAccountId, workspaceId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('Ad account');
  }
  return rows[0].platform;
}

/**
 * Verify that a campaign belongs to the caller's workspace.
 */
async function verifyCampaignWorkspace(
  campaignId: string,
  workspaceId: string,
): Promise<{
  id: string;
  name: string;
  platform: Platform;
  platform_campaign_id: string;
  status: CampaignStatus;
}> {
  const { rows } = await query<{
    id: string;
    name: string;
    platform: Platform;
    platform_campaign_id: string;
    status: CampaignStatus;
  }>(
    `SELECT c.id, c.name, a.platform, c.platform_campaign_id, c.status
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE c.id = $1 AND a.workspace_id = $2
      LIMIT 1`,
    [campaignId, workspaceId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('Campaign');
  }
  return rows[0];
}

// ═══════════════════════════════════════════════════════════════
// GET /campaigns — List campaigns
// ═══════════════════════════════════════════════════════════════

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // ── Parse & sanitise query params ─────────────────────────
    const rawPlatform = req.query.platform as string | undefined;
    const rawStatus = req.query.status as string | undefined;
    const rawSearch = req.query.search as string | undefined;
    const rawSortBy = req.query.sortBy as string | undefined;
    const rawSortDir = req.query.sortDir as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
    const offset = (page - 1) * limit;

    const platform = rawPlatform?.toLowerCase();
    const status = rawStatus?.toLowerCase();
    const search = rawSearch?.trim();
    const sortCol = SORTABLE_COLUMNS[rawSortBy ?? ''] ?? 'c.created_at';
    const sortDir = rawSortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // ── Build WHERE clause dynamically ────────────────────────
    const whereParts: string[] = ['a.workspace_id = $1'];
    const params: unknown[] = [workspaceId];
    let paramIdx = 1;

    if (platform) {
      paramIdx++;
      whereParts.push(`a.platform = $${paramIdx}`);
      params.push(platform);
    }
    if (status) {
      paramIdx++;
      whereParts.push(`c.status = $${paramIdx}`);
      params.push(status);
    }
    if (search) {
      paramIdx++;
      whereParts.push(`c.name ILIKE $${paramIdx}`);
      params.push(`%${search}%`);
    }

    const whereSql = whereParts.join(' AND ');

    // ── Count query (for pagination) ──────────────────────────
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
         FROM campaigns c
         JOIN ad_accounts a ON a.id = c.ad_account_id
        WHERE ${whereSql}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    // ── Data query with pagination ────────────────────────────
    const dataSql = `
      SELECT c.*,
             a.platform,
             a.account_id   AS ad_account_account_id,
             a.name         AS ad_account_name
        FROM campaigns c
        JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}
    `;
    params.push(limit, offset);

    const { rows: campaigns } = await query(dataSql, params) as unknown as { rows: UnifiedCampaign[] };

    res.json({
      success: true,
      data: campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /campaigns/summary — Workspace campaign summary
// MUST come before /:id to avoid being captured as an ID
// ═══════════════════════════════════════════════════════════════

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // ── Total campaigns & aggregate performance ───────────────
    const { rows: aggregate } = await query<{
      total_campaigns: number;
      active_campaigns: number;
      total_spend: number;
      total_conversions: number;
      avg_ctr: number;
      avg_roas: number;
    }>(
      `SELECT
         COUNT(*)::int AS total_campaigns,
         COUNT(*) FILTER (WHERE c.status = 'active')::int AS active_campaigns,
         COALESCE(SUM(c.spend), 0)::numeric AS total_spend,
         COALESCE(SUM(c.conversions), 0)::int AS total_conversions,
         COALESCE(AVG(NULLIF(c.ctr, 0)), 0)::numeric AS avg_ctr,
         COALESCE(AVG(NULLIF(c.roas, 0)), 0)::numeric AS avg_roas
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE a.workspace_id = $1`,
      [workspaceId],
    );

    // ── Platform breakdown ────────────────────────────────────
    const { rows: platformBreakdown } = await query<{
      platform: string;
      count: number;
      active_count: number;
      total_spend: number;
    }>(
      `SELECT
         a.platform,
         COUNT(*)::int AS count,
         COUNT(*) FILTER (WHERE c.status = 'active')::int AS active_count,
         COALESCE(SUM(c.spend), 0)::numeric AS total_spend
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE a.workspace_id = $1
      GROUP BY a.platform`,
      [workspaceId],
    );

    // ── Status breakdown ──────────────────────────────────────
    const { rows: statusBreakdown } = await query<{
      status: string;
      count: number;
    }>(
      `SELECT
         c.status,
         COUNT(*)::int AS count
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
      WHERE a.workspace_id = $1
      GROUP BY c.status`,
      [workspaceId],
    );

    const agg = aggregate[0];

    res.json({
      success: true,
      data: {
        totalCampaigns: agg?.total_campaigns ?? 0,
        activeCampaigns: agg?.active_campaigns ?? 0,
        totalSpend: agg?.total_spend ?? 0,
        totalConversions: agg?.total_conversions ?? 0,
        avgCTR: agg?.avg_ctr ?? 0,
        avgROAS: agg?.avg_roas ?? 0,
        platformBreakdown: platformBreakdown ?? [],
        statusBreakdown: statusBreakdown ?? [],
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /campaigns/:id — Get single campaign (with ad sets + ads)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    // ── Fetch campaign ────────────────────────────────────────
    const { rows: campaignRows } = await query(
      `SELECT c.*, a.platform, a.name AS ad_account_name
         FROM campaigns c
         JOIN ad_accounts a ON a.id = c.ad_account_id
        WHERE c.id = $1 AND a.workspace_id = $2
        LIMIT 1`,
      [campaignId, workspaceId],
    ) as unknown as { rows: UnifiedCampaign[] };

    if (campaignRows.length === 0) {
      throw new NotFoundError('Campaign');
    }

    const campaign = campaignRows[0];

    // ── Fetch ad sets ─────────────────────────────────────────
    const { rows: adSets } = await query(
      `SELECT id, platform_adset_id, name, status, daily_budget,
              bid_strategy, bid_amount, targeting, platform_data, created_at
         FROM adsets
        WHERE campaign_id = $1
        ORDER BY created_at DESC`,
      [campaignId],
    );

    // ── Fetch ads ─────────────────────────────────────────────
    const adSetIds = adSets.map((s) => s.id);
    let ads: Array<Record<string, unknown>> = [];
    if (adSetIds.length > 0) {
      const { rows: adsRows } = await query(
        `SELECT id, adset_id, platform_ad_id, name, status, creative_type,
                creative_url, creative_text, spend, impressions, clicks, ctr,
                conversions, cpa, roas, frequency, fatigue_score, fatigue_status,
                created_at
           FROM ads
          WHERE adset_id = ANY($1)
          ORDER BY created_at DESC`,
        [adSetIds],
      );
      ads = adsRows;
    }

    // ── Attach ads to ad sets ─────────────────────────────────
    const adSetsWithAds = adSets.map((adSet) => ({
      ...adSet,
      ads: ads.filter((ad) => ad.adset_id === adSet.id),
    }));

    res.json({
      success: true,
      data: {
        ...campaign,
        ad_sets: adSetsWithAds,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /campaigns — Create campaign (DRAFT first!)
// ═══════════════════════════════════════════════════════════════

router.post(
  '/',
  requireMutator,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      name: z.string().min(1).max(500),
      platform: z.enum(['meta', 'google', 'tiktok', 'snap']),
      objective: z.string().min(1),
      budgetType: z.enum(['daily', 'lifetime']).optional().default('daily'),
      budget: z.number().positive().optional(),
      bidStrategy: z.string().optional(),
      targeting: z.record(z.unknown()).optional(),
      schedule: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      adAccountId: z.string().uuid(),
    }).strict(); // Reject unknown fields — prevents client from sending server-controlled fields like spend, status

    const body = schema.parse(req.body);

    await assertCampaignQuota(workspaceId);

    // Verify ad account belongs to workspace
    const resolvedPlatform = await getAdAccountPlatform(body.adAccountId, workspaceId);

    // Validate requested platform matches ad account platform
    if (resolvedPlatform !== body.platform) {
      throw new ValidationError(
        `Ad account platform (${resolvedPlatform}) does not match requested platform (${body.platform})`,
      );
    }

    // ── Create a DRAFT — the core safety model ────────────────
    const draft = await createDraft({
      workspaceId,
      platform: resolvedPlatform,
      draftType: 'campaign_create',
      changeSummary: `Create campaign "${body.name}"`,
      changeDetail: {
        name: body.name,
        platform: body.platform,
        objective: body.objective,
        budget_type: body.budgetType,
        budget: body.budget,
        bid_strategy: body.bidStrategy,
        targeting: body.targeting,
        schedule: body.schedule,
        ad_account_id: body.adAccountId,
      },
      aiReasoning: 'User-initiated campaign creation',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.status(201).json({
      success: true,
      data: draft,
      message: 'Campaign creation drafted. Review and approve to go live.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /campaigns/:id — Update campaign (creates DRAFT)
// ═══════════════════════════════════════════════════════════════

router.put(
  '/:id',
  requireMutator,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    // Verify campaign exists and belongs to workspace
    const campaign = await verifyCampaignWorkspace(campaignId, workspaceId);

    const schema = z.object({
      name: z.string().min(1).max(500).optional(),
      objective: z.string().optional(),
      budgetType: z.enum(['daily', 'lifetime']).optional(),
      budget: z.number().positive().optional(),
      bidStrategy: z.string().optional(),
      targeting: z.record(z.unknown()).optional(),
      schedule: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      status: z.enum(['active', 'paused', 'draft', 'ended']).optional(),
    }).strict(); // Reject unknown fields

    const body = schema.parse(req.body);

    // Track what changed
    const changes: Record<string, unknown> = {};
    const changeDetails: Record<string, { old_value?: unknown; new_value?: unknown }> = {};

    if (body.name !== undefined && body.name !== campaign.name) {
      changes.name = body.name;
      changeDetails.name = { old_value: campaign.name, new_value: body.name };
    }
    if (body.objective !== undefined) {
      changes.objective = body.objective;
      changeDetails.objective = { new_value: body.objective };
    }
    if (body.budgetType !== undefined) {
      changes.budget_type = body.budgetType;
      changeDetails.budget_type = { new_value: body.budgetType };
    }
    if (body.budget !== undefined) {
      changes.budget = body.budget;
      changeDetails.budget = { new_value: body.budget };
    }
    if (body.bidStrategy !== undefined) {
      changes.bid_strategy = body.bidStrategy;
      changeDetails.bid_strategy = { new_value: body.bidStrategy };
    }
    if (body.targeting !== undefined) {
      changes.targeting = body.targeting;
      changeDetails.targeting = { new_value: body.targeting };
    }
    if (body.schedule !== undefined) {
      changes.schedule = body.schedule;
      changeDetails.schedule = { new_value: body.schedule };
    }
    if (body.status !== undefined && body.status !== campaign.status) {
      changes.status = body.status;
      changeDetails.status = { old_value: campaign.status, new_value: body.status };
    }

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes provided');
    }

    // Determine specific draft type based on what changed
    let draftType: DraftType = 'name_change';
    const changeKeys = Object.keys(changes);
    if (changeKeys.length === 1) {
      if (changeKeys[0] === 'budget' || changeKeys[0] === 'budget_type') {
        draftType = 'budget_change';
      } else if (changeKeys[0] === 'status') {
        draftType = 'status_change';
      } else if (changeKeys[0] === 'targeting') {
        draftType = 'targeting_edit';
      } else if (changeKeys[0] === 'bid_strategy') {
        draftType = 'bid_adjustment';
      } else if (changeKeys[0] === 'schedule') {
        draftType = 'schedule_change';
      }
    } else if (changeKeys.length > 1) {
      // Multi-field update — use the most significant change as the type
      if (changeKeys.includes('budget') || changeKeys.includes('budget_type')) {
        draftType = 'budget_change';
      } else if (changeKeys.includes('targeting')) {
        draftType = 'targeting_edit';
      } else if (changeKeys.includes('status')) {
        draftType = 'status_change';
      } else if (changeKeys.includes('bid_strategy')) {
        draftType = 'bid_adjustment';
      } else if (changeKeys.includes('schedule')) {
        draftType = 'schedule_change';
      }
    }

    const draft = await createDraft({
      workspaceId,
      platform: campaign.platform,
      campaignId: campaign.id,
      draftType,
      changeSummary: `Update "${campaign.name}": ${Object.keys(changes).join(', ')}`,
      changeDetail: {
        platform_campaign_id: campaign.platform_campaign_id,
        campaign_name: campaign.name,
        ...changeDetails,
      },
      aiReasoning: 'User-initiated campaign update',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Campaign update drafted. Review and approve to apply.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// DELETE /campaigns/:id — Delete/archive campaign (DRAFT)
// ═══════════════════════════════════════════════════════════════

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    // Verify campaign exists and belongs to workspace
    const campaign = await verifyCampaignWorkspace(campaignId, workspaceId);

    const draft = await createDraft({
      workspaceId,
      platform: campaign.platform,
      campaignId: campaign.id,
      draftType: 'campaign_delete',
      changeSummary: `Delete campaign "${campaign.name}"`,
      changeDetail: {
        platform_campaign_id: campaign.platform_campaign_id,
        campaign_name: campaign.name,
        current_status: campaign.status,
      },
      aiReasoning: 'User-initiated campaign deletion',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Campaign deletion drafted. Review and approve to apply.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /campaigns/:id/pause — Pause campaign (DRAFT)
// ═══════════════════════════════════════════════════════════════

router.post(
  '/:id/pause',
  requireMutator,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    const campaign = await verifyCampaignWorkspace(campaignId, workspaceId);

    if (campaign.status === 'paused') {
      throw new ValidationError('Campaign is already paused');
    }

    const draft = await createDraft({
      workspaceId,
      platform: campaign.platform,
      campaignId: campaign.id,
      draftType: 'status_change',
      changeSummary: `Pause campaign "${campaign.name}"`,
      changeDetail: {
        platform_campaign_id: campaign.platform_campaign_id,
        campaign_name: campaign.name,
        old_status: campaign.status,
        new_status: 'paused',
      },
      aiReasoning: 'User-initiated campaign pause',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Campaign pause drafted. Review and approve to apply.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /campaigns/:id/resume — Resume campaign (DRAFT)
// ═══════════════════════════════════════════════════════════════

router.post(
  '/:id/resume',
  requireMutator,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    const campaign = await verifyCampaignWorkspace(campaignId, workspaceId);

    if (campaign.status === 'active') {
      throw new ValidationError('Campaign is already active');
    }

    const draft = await createDraft({
      workspaceId,
      platform: campaign.platform,
      campaignId: campaign.id,
      draftType: 'status_change',
      changeSummary: `Resume campaign "${campaign.name}"`,
      changeDetail: {
        platform_campaign_id: campaign.platform_campaign_id,
        campaign_name: campaign.name,
        old_status: campaign.status,
        new_status: 'active',
      },
      aiReasoning: 'User-initiated campaign resume',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Campaign resume drafted. Review and approve to apply.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /campaigns/:id/duplicate — Duplicate campaign (DRAFT)
// ═══════════════════════════════════════════════════════════════

router.post(
  '/:id/duplicate',
  requireMutator,
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    const campaign = await verifyCampaignWorkspace(campaignId, workspaceId);

    // Fetch campaign details for duplication
    const { rows: campaignDetails } = await query<{
      name: string;
      objective: string;
      daily_budget: number;
      lifetime_budget: number;
      budget_type: string;
      start_date: string;
      end_date: string;
      platform_data: Record<string, unknown>;
    }>(
      `SELECT name, objective, daily_budget, lifetime_budget, budget_type,
              start_date, end_date, platform_data
         FROM campaigns
        WHERE id = $1
        LIMIT 1`,
      [campaignId],
    );

    const details = campaignDetails[0];

    // Fetch ad sets with targeting for duplication context
    const { rows: adSets } = await query<{
      name: string;
      daily_budget: number;
      bid_strategy: string;
      bid_amount: number;
      targeting: Record<string, unknown>;
      platform_data: Record<string, unknown>;
    }>(
      `SELECT name, daily_budget, bid_strategy, bid_amount,
              targeting, platform_data
         FROM adsets
        WHERE campaign_id = $1`,
      [campaignId],
    );

    const draft = await createDraft({
      workspaceId,
      platform: campaign.platform,
      campaignId: campaign.id,
      draftType: 'campaign_duplicate',
      changeSummary: `Duplicate campaign "${campaign.name}"`,
      changeDetail: {
        platform_campaign_id: campaign.platform_campaign_id,
        source_campaign_name: campaign.name,
        campaign_config: {
          name: `${details.name} (Copy)`,
          objective: details.objective,
          daily_budget: details.daily_budget,
          lifetime_budget: details.lifetime_budget,
          budget_type: details.budget_type,
          start_date: details.start_date,
          end_date: details.end_date,
          platform_data: details.platform_data,
        },
        adsets_count: adSets.length,
        adsets: adSets.map((s) => ({
          name: s.name,
          daily_budget: s.daily_budget,
          bid_strategy: s.bid_strategy,
          bid_amount: s.bid_amount,
          targeting: s.targeting,
        })),
      },
      aiReasoning: 'User-initiated campaign duplication',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Campaign duplication drafted. Review and approve to create the copy.',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /campaigns/:id/insights — Campaign performance
// ═══════════════════════════════════════════════════════════════

router.get(
  '/:id/insights',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.params.id;

    // Verify campaign belongs to workspace
    await verifyCampaignWorkspace(campaignId, workspaceId);

    // Parse date range
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFrom = (req.query.dateFrom as string) ?? thirtyDaysAgo.toISOString().slice(0, 10);
    const dateTo = (req.query.dateTo as string) ?? now.toISOString().slice(0, 10);

    // ── Aggregated totals ─────────────────────────────────────
    const { rows: totals } = await query<{
      total_impressions: number;
      total_clicks: number;
      total_spend: number;
      total_conversions: number;
      total_conversion_value: number;
      total_reach: number;
      avg_ctr: number;
      avg_cpc: number;
      avg_cpm: number;
      avg_cpa: number;
      avg_roas: number;
      avg_frequency: number;
    }>(
      `SELECT
         COALESCE(SUM(impressions), 0)::int AS total_impressions,
         COALESCE(SUM(clicks), 0)::int AS total_clicks,
         COALESCE(SUM(spend), 0)::numeric AS total_spend,
         COALESCE(SUM(conversions), 0)::int AS total_conversions,
         COALESCE(SUM(conversion_value), 0)::numeric AS total_conversion_value,
         COALESCE(SUM(reach), 0)::int AS total_reach,
         COALESCE(AVG(ctr), 0)::numeric AS avg_ctr,
         COALESCE(AVG(cpc), 0)::numeric AS avg_cpc,
         COALESCE(AVG(cpm), 0)::numeric AS avg_cpm,
         COALESCE(AVG(cpa), 0)::numeric AS avg_cpa,
         COALESCE(AVG(roas), 0)::numeric AS avg_roas,
         COALESCE(AVG(frequency), 0)::numeric AS avg_frequency
       FROM campaign_metrics
      WHERE campaign_id = $1 AND date >= $2 AND date <= $3`,
      [campaignId, dateFrom, dateTo],
    );

    // ── Daily breakdown ───────────────────────────────────────
    const { rows: daily } = await query<{
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversion_value: number;
      reach: number;
      frequency: number;
      ctr: number;
      cpc: number;
      cpm: number;
      cpa: number;
      roas: number;
    }>(
      `SELECT
         date,
         impressions,
         clicks,
         spend,
         conversions,
         conversion_value,
         reach,
         frequency,
         ctr,
         cpc,
         cpm,
         cpa,
         roas
       FROM campaign_metrics
      WHERE campaign_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC`,
      [campaignId, dateFrom, dateTo],
    );

    res.json({
      success: true,
      data: {
        campaign_id: campaignId,
        date_range: { from: dateFrom, to: dateTo },
        totals: totals[0] ?? {
          total_impressions: 0,
          total_clicks: 0,
          total_spend: 0,
          total_conversions: 0,
          total_conversion_value: 0,
          total_reach: 0,
          avg_ctr: 0,
          avg_cpc: 0,
          avg_cpm: 0,
          avg_cpa: 0,
          avg_roas: 0,
          avg_frequency: 0,
        },
        daily,
      },
    });
  }),
);

export default router;
