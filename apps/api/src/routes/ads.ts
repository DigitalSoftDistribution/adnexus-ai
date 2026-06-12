import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { ValidationError, NotFoundError } from '../lib/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { createDraft } from '../services/drafts-service';
import { assertCreativeQuota } from '../services/plan-limits';
import type { UnifiedAd, Platform } from '../types';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Fetch a single ad by ID with full creative and campaign context.
 * Validates workspace ownership via the campaign → ad_account chain.
 */
async function getAdWithContext(adId: string, workspaceId: string) {
  const { data, error } = await supabase
    .from('ads')
    .select(
      `*,
      adsets!inner(id, name, status, campaign_id, targeting, daily_budget, bid_strategy, bid_amount),
      adsets!inner(campaigns!inner(id, name, platform, status, objective, daily_budget, lifetime_budget, ad_account_id))
    `,
    )
    .eq('id', adId)
    .eq('adsets.campaigns.ad_accounts.workspace_id', workspaceId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Transform a raw DB ad row into the UnifiedAd shape expected by the API.
 */
function transformAd(row: Record<string, unknown>): UnifiedAd {
  const adset = (row.adsets ?? {}) as Record<string, unknown>;
  const campaign = (adset.campaigns ?? {}) as Record<string, unknown>;

  return {
    id: row.id as string,
    adset_id: row.adset_id as string,
    platform_ad_id: row.platform_ad_id as string,
    name: row.name as string,
    status: row.status as UnifiedAd['status'],
    creative_type: row.creative_type as string | undefined,
    creative_url: row.creative_url as string | undefined,
    creative_text: row.creative_text as string | undefined,
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
    conversions: Number(row.conversions ?? 0),
    cpa: Number(row.cpa ?? 0),
    roas: Number(row.roas ?? 0),
    frequency: Number(row.frequency ?? 0),
    fatigue_score: Number(row.fatigue_score ?? 0),
    fatigue_status: (row.fatigue_status as UnifiedAd['fatigue_status']) ?? 'healthy',
    // Enriched join data attached as metadata
    campaign_id: campaign.id as string | undefined,
    campaign_name: campaign.name as string | undefined,
    platform: campaign.platform as Platform | undefined,
    adset_name: adset.name as string | undefined,
    targeting: adset.targeting as Record<string, unknown> | undefined,
    created_at: row.created_at as string,
  } as unknown as UnifiedAd;
}

// ─── GET /api/v1/ads ─────────────────────────────────────────
// List ads with filters, joined with campaigns and ad sets

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const campaignId = req.query.campaignId as string | undefined;
    const platform = req.query.platform as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));

    // Start with workspace-scoped query
    let query = supabase
      .from('ads')
      .select(
        `*,
        adsets!inner(id, name, campaign_id, targeting, status, campaigns!inner(id, name, platform, status, ad_account_id))
        `,
        { count: 'exact' },
      )
      .eq('adsets.campaigns.ad_accounts.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (campaignId) {
      query = query.eq('adsets.campaigns.id', campaignId);
    }
    if (platform) {
      query = query.eq('adsets.campaigns.platform', platform);
    }
    if (status) {
      query = query.eq('ads.status', status);
    }
    if (search) {
      query = query.ilike('ads.name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to fetch ads: ${error.message}`);

    const ads = (data ?? []).map(transformAd);

    res.json({
      success: true,
      data: ads,
      total: count ?? 0,
      pagination: {
        page,
        limit,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  }),
);

// ─── GET /api/v1/ads/:id ─────────────────────────────────────
// Full ad details with creative info and performance summary

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    const ad = transformAd(row);

    // Compute a quick performance summary from the ad row
    const performanceSummary = {
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      conversions: Number(row.conversions ?? 0),
      cpa: Number(row.cpa ?? 0),
      roas: Number(row.roas ?? 0),
      frequency: Number(row.frequency ?? 0),
      fatigue_score: Number(row.fatigue_score ?? 0),
      fatigue_status: (row.fatigue_status as UnifiedAd['fatigue_status']) ?? 'healthy',
    };

    res.json({
      success: true,
      data: {
        ...ad,
        performance: performanceSummary,
      },
    });
  }),
);

// ─── POST /api/v1/ads ────────────────────────────────────────
// Create ad — creates a DRAFT (core safety model)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      campaignId: z.string().uuid(),
      adSetId: z.string().uuid(),
      name: z.string().min(1).max(500),
      creativeType: z.string().optional(),
      headline: z.string().optional(),
      body: z.string().optional(),
      callToAction: z.string().optional(),
      landingPageUrl: z.string().url().optional(),
      creativeUrl: z.string().url().optional(),
      targeting: z.record(z.unknown()).optional(),
    });

    const body = schema.parse(req.body);

    // Verify the campaign and ad set belong to this workspace
    const { data: adset, error: adsetError } = await supabase
      .from('adsets')
      .select('id, name, campaigns!inner(id, name, platform, ad_account_id, ad_accounts!inner(workspace_id))')
      .eq('id', body.adSetId)
      .eq('campaigns.ad_accounts.workspace_id', workspaceId)
      .single();

    if (adsetError || !adset) {
      throw new ValidationError('Invalid adSetId: ad set not found in workspace');
    }

    const campaign = (adset.campaigns ?? {}) as unknown as Record<string, unknown>;
    const platform = (campaign.platform as Platform) ?? 'meta';

    await assertCreativeQuota(workspaceId);

    // Create a DRAFT instead of creating directly — this is the core differentiator
    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: body.campaignId,
      adsetId: body.adSetId,
      draftType: 'creative_upload' as const,
      changeSummary: `Create new ad "${body.name}"`,
      changeDetail: {
        ad_name: body.name,
        adset_id: body.adSetId,
        adset_name: adset.name,
        campaign_id: body.campaignId,
        creative_type: body.creativeType,
        headline: body.headline,
        body: body.body,
        call_to_action: body.callToAction,
        landing_page_url: body.landingPageUrl,
        creative_url: body.creativeUrl,
        targeting: body.targeting,
      },
      aiReasoning: 'User-initiated ad creation',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.status(201).json({
      success: true,
      data: draft,
      message: 'Ad creation drafted. Review and approve to go live.',
    });
  }),
);

// ─── PUT /api/v1/ads/:id ─────────────────────────────────────
// Update ad — creates a DRAFT (core safety model)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    const schema = z.object({
      name: z.string().min(1).max(500).optional(),
      creativeType: z.string().optional(),
      headline: z.string().optional(),
      body: z.string().optional(),
      callToAction: z.string().optional(),
      landingPageUrl: z.string().url().optional(),
      creativeUrl: z.string().url().optional(),
      targeting: z.record(z.unknown()).optional(),
    });

    const body = schema.parse(req.body);

    // Collect actual changes
    const changes: Record<string, unknown> = {};
    const changeDetails: Record<string, unknown> = {};

    if (body.name && body.name !== row.name) {
      changes.name = body.name;
      changeDetails.name = { old: row.name, new: body.name };
    }
    if (body.creativeType && body.creativeType !== row.creative_type) {
      changes.creative_type = body.creativeType;
      changeDetails.creative_type = { old: row.creative_type, new: body.creativeType };
    }
    if (body.headline && body.headline !== row.creative_text) {
      changes.headline = body.headline;
      changeDetails.headline = { old: row.creative_text, new: body.headline };
    }
    if (body.body && body.body !== row.creative_text) {
      changes.body_text = body.body;
      changeDetails.body = { old: row.creative_text, new: body.body };
    }
    if (body.callToAction) {
      changes.call_to_action = body.callToAction;
      changeDetails.call_to_action = { old: (row.platform_data as Record<string, unknown>)?.call_to_action, new: body.callToAction };
    }
    if (body.landingPageUrl) {
      changes.landing_page_url = body.landingPageUrl;
      changeDetails.landing_page_url = { old: (row.platform_data as Record<string, unknown>)?.landing_page_url, new: body.landingPageUrl };
    }
    if (body.creativeUrl && body.creativeUrl !== row.creative_url) {
      changes.creative_url = body.creativeUrl;
      changeDetails.creative_url = { old: row.creative_url, new: body.creativeUrl };
    }
    if (body.targeting) {
      changes.targeting = body.targeting;
      changeDetails.targeting = { new: body.targeting };
    }

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes provided');
    }

    const adset = (row.adsets ?? {}) as Record<string, unknown>;
    const campaign = (adset.campaigns ?? {}) as unknown as Record<string, unknown>;
    const platform = (campaign.platform as Platform) ?? 'meta';

    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: campaign.id as string | undefined,
      adsetId: row.adset_id as string | undefined,
      adId,
      draftType: 'targeting_edit' as const,
      changeSummary: `Update ad "${row.name}": ${Object.keys(changes).join(', ')}`,
      changeDetail: {
        platform_ad_id: row.platform_ad_id,
        ad_name: row.name,
        ...changeDetails,
      },
      aiReasoning: 'User-initiated ad update',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Ad update drafted. Review and approve to apply.',
    });
  }),
);

// ─── POST /api/v1/ads/:id/pause ──────────────────────────────
// Pause ad — creates a DRAFT (core safety model)

router.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    if (row.status === 'paused') {
      throw new ValidationError('Ad is already paused');
    }

    const adset = (row.adsets ?? {}) as Record<string, unknown>;
    const campaign = (adset.campaigns ?? {}) as unknown as Record<string, unknown>;
    const platform = (campaign.platform as Platform) ?? 'meta';

    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: campaign.id as string | undefined,
      adsetId: row.adset_id as string | undefined,
      adId,
      draftType: 'status_change',
      changeSummary: `Pause ad "${row.name}"`,
      changeDetail: {
        platform_ad_id: row.platform_ad_id,
        ad_name: row.name,
        field: 'status',
        old_value: row.status,
        new_value: 'paused',
      },
      aiReasoning: 'User-initiated ad pause',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Ad pause drafted. Review and approve to apply.',
    });
  }),
);

// ─── POST /api/v1/ads/:id/resume ─────────────────────────────
// Resume ad — creates a DRAFT (core safety model)

router.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    if (row.status === 'active') {
      throw new ValidationError('Ad is already active');
    }

    const adset = (row.adsets ?? {}) as Record<string, unknown>;
    const campaign = (adset.campaigns ?? {}) as unknown as Record<string, unknown>;
    const platform = (campaign.platform as Platform) ?? 'meta';

    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: campaign.id as string | undefined,
      adsetId: row.adset_id as string | undefined,
      adId,
      draftType: 'status_change',
      changeSummary: `Resume ad "${row.name}"`,
      changeDetail: {
        platform_ad_id: row.platform_ad_id,
        ad_name: row.name,
        field: 'status',
        old_value: row.status,
        new_value: 'active',
      },
      aiReasoning: 'User-initiated ad resume',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Ad resume drafted. Review and approve to apply.',
    });
  }),
);

// ─── POST /api/v1/ads/:id/duplicate ──────────────────────────
// Duplicate ad — creates a DRAFT (core safety model)

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    const adset = (row.adsets ?? {}) as Record<string, unknown>;
    const campaign = (adset.campaigns ?? {}) as unknown as Record<string, unknown>;
    const platform = (campaign.platform as Platform) ?? 'meta';

    const duplicatedName = `${row.name} (Copy)`;

    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: campaign.id as string | undefined,
      adsetId: row.adset_id as string | undefined,
      adId,
      draftType: 'campaign_duplicate',
      changeSummary: `Duplicate ad "${row.name}" as "${duplicatedName}"`,
      changeDetail: {
        source_ad_id: adId,
        platform_ad_id: row.platform_ad_id,
        source_ad_name: row.name,
        new_ad_name: duplicatedName,
        adset_id: row.adset_id,
        adset_name: adset.name,
        campaign_id: campaign.id,
        creative_type: row.creative_type,
        creative_url: row.creative_url,
        creative_text: row.creative_text,
        landing_page_url: (row.platform_data as Record<string, unknown>)?.landing_page_url,
        call_to_action: (row.platform_data as Record<string, unknown>)?.call_to_action,
      },
      aiReasoning: 'User-initiated ad duplication',
      actorType: 'user',
      actorId: req.user?.sub,
    });

    res.json({
      success: true,
      data: draft,
      message: 'Ad duplication drafted. Review and approve to create the copy.',
    });
  }),
);

// ─── GET /api/v1/ads/:id/performance ─────────────────────────
// Ad performance metrics with optional date range

router.get(
  '/:id/performance',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;
    const dateFrom = (req.query.dateFrom as string) ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = (req.query.dateTo as string) ?? new Date().toISOString().slice(0, 10);

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    // Since we don't have a separate daily_metrics table, we derive from the ad row
    // In production, this would query a time-series metrics table
    const adMetrics = {
      ad_id: adId,
      ad_name: row.name as string,
      date_from: dateFrom,
      date_to: dateTo,
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      conversions: Number(row.conversions ?? 0),
      cpa: Number(row.cpa ?? 0),
      roas: Number(row.roas ?? 0),
      frequency: Number(row.frequency ?? 0),
      cpm: Number(row.cpm ?? 0),
      cpc: Number(row.cpc ?? 0),
    };

    // Generate daily breakdown (synthetic — in production this queries daily_metrics)
    const dailyMetrics: Array<{
      date: string;
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      conversions: number;
      cpa: number;
      roas: number;
    }> = [];

    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);

      // Distribute totals roughly evenly with small random variation
      const dayFactor = 1 / days;
      dailyMetrics.push({
        date: dateStr,
        spend: Math.round(adMetrics.spend * dayFactor * 100) / 100,
        impressions: Math.round(adMetrics.impressions * dayFactor),
        clicks: Math.round(adMetrics.clicks * dayFactor),
        ctr: adMetrics.ctr,
        conversions: Math.round(adMetrics.conversions * dayFactor),
        cpa: adMetrics.cpa,
        roas: adMetrics.roas,
      });
    }

    // Aggregate summary
    const summary = {
      total_spend: adMetrics.spend,
      total_impressions: adMetrics.impressions,
      total_clicks: adMetrics.clicks,
      avg_ctr: adMetrics.ctr,
      total_conversions: adMetrics.conversions,
      avg_cpa: adMetrics.cpa,
      avg_roas: adMetrics.roas,
      avg_frequency: adMetrics.frequency,
      days,
    };

    res.json({
      success: true,
      data: {
        metrics: dailyMetrics,
        summary,
      },
    });
  }),
);

// ─── GET /api/v1/ads/:id/creative-performance ────────────────
// Creative-specific metrics: fatigue score, CTR trend, conversion trend

router.get(
  '/:id/creative-performance',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const adId = req.params.id;

    const row = await getAdWithContext(adId, workspaceId);
    if (!row) throw new NotFoundError('Ad');

    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const frequency = Number(row.frequency ?? 0);
    const fatigueScore = Number(row.fatigue_score ?? 0);
    const fatigueStatus = (row.fatigue_status as UnifiedAd['fatigue_status']) ?? 'healthy';

    // Derive CTR trend based on fatigue and frequency
    // Higher frequency → declining CTR (creative fatigue)
    const baseCtr = impressions > 0 ? clicks / impressions : 0;
    const ctrTrend = {
      current: Number((baseCtr * 100).toFixed(2)),
      direction: frequency > 3 ? 'declining' : frequency > 2 ? 'stable' : 'improving',
      estimated_next_week: Number((baseCtr * 100 * (frequency > 3 ? 0.85 : frequency > 2 ? 0.95 : 1.05)).toFixed(2)),
    };

    // Conversion trend
    const baseConversionRate = clicks > 0 ? conversions / clicks : 0;
    const conversionTrend = {
      current: Number((baseConversionRate * 100).toFixed(2)),
      direction: fatigueStatus === 'critical' ? 'declining' : fatigueStatus === 'warning' ? 'stable' : 'improving',
      estimated_next_week: Number(
        (baseConversionRate * 100 * (fatigueStatus === 'critical' ? 0.8 : fatigueStatus === 'warning' ? 0.95 : 1.02)).toFixed(2),
      ),
    };

    // Fatigue analysis
    const fatigueAnalysis = {
      score: Number(fatigueScore.toFixed(2)),
      status: fatigueStatus,
      frequency,
      risk_level:
        fatigueStatus === 'exhausted'
          ? 'critical'
          : fatigueStatus === 'critical'
            ? 'high'
            : fatigueStatus === 'warning'
              ? 'medium'
              : 'low',
      recommendation:
        fatigueStatus === 'healthy'
          ? 'Creative is performing well. Continue monitoring.'
          : fatigueStatus === 'warning'
            ? 'Creative showing early fatigue signs. Consider refreshing soon.'
            : fatigueStatus === 'critical'
              ? 'Creative significantly fatigued. Refresh recommended within 48 hours.'
              : 'Creative exhausted. Immediate refresh required for optimal performance.',
      estimated_days_to_fatigue:
        fatigueStatus === 'healthy'
          ? Math.round(14 - frequency * 2)
          : fatigueStatus === 'warning'
            ? Math.round(7 - frequency)
            : fatigueStatus === 'critical'
              ? 3
              : 0,
    };

    res.json({
      success: true,
      data: {
        ad_id: adId,
        ad_name: row.name as string,
        creative_type: row.creative_type as string | undefined,
        creative_url: row.creative_url as string | undefined,
        fatigue: fatigueAnalysis,
        ctr_trend: ctrTrend,
        conversion_trend: conversionTrend,
        overall_health_score: Math.max(0, Math.min(100, Math.round(100 - fatigueScore * 10))),
      },
    });
  }),
);

export default router;
