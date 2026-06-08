import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { createDraft } from '../services/drafts-service';
import {
  RecommendationGenerator,
  CreativeFatigueDetector,
  RuleEvaluator,
} from '../ai-engine';
import {
  NotFoundError,
  ValidationError,
  AppError,
} from '../lib/errors';
import type { Platform, DraftType } from '../types';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// AI Agent Runtime State
// ═══════════════════════════════════════════════════════════════

interface AgentRuntimeState {
  isRunning: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

const agentRuntimeState: Map<string, AgentRuntimeState> = new Map();

function getAgentState(workspaceId: string): AgentRuntimeState {
  const existing = agentRuntimeState.get(workspaceId);
  if (existing) return existing;
  const fresh: AgentRuntimeState = {
    isRunning: true,
    pausedAt: null,
    pausedBy: null,
    lastRunAt: null,
    nextRunAt: null,
  };
  agentRuntimeState.set(workspaceId, fresh);
  return fresh;
}

// ═══════════════════════════════════════════════════════════════
// GET /agent/status — AI Agent status
// ═══════════════════════════════════════════════════════════════

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const state = getAgentState(workspaceId);

    // Count active rules
    const { count: rulesActive, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');
    if (rulesError) throw rulesError;

    // Count optimizations (AI actions) today
    const today = new Date().toISOString().slice(0, 10);
    const { count: optimizationsToday, error: optError } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('action_category', 'agent_action')
      .gte('created_at', today);
    if (optError) throw optError;

    // Credit usage
    const { data: creditRow, error: creditError } = await supabase
      .from('ai_credits')
      .select('credits_used, credits_limit, remaining')
      .eq('workspace_id', workspaceId)
      .single();
    if (creditError && creditError.code !== 'PGRST116') throw creditError;

    const creditsUsed = creditRow?.credits_used ?? 0;
    const creditsTotal = creditRow?.credits_limit ?? 0;

    // Next scheduled run (every 15 min from last run, or now+15min)
    const nextRunAt = state.isRunning
      ? state.nextRunAt ?? new Date(Date.now() + 15 * 60_000).toISOString()
      : null;

    res.json({
      success: true,
      data: {
        isRunning: state.isRunning,
        lastRunAt: state.lastRunAt,
        nextRunAt,
        rulesActive: rulesActive ?? 0,
        optimizationsToday: optimizationsToday ?? 0,
        creditsUsed,
        creditsTotal,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/rules — List automation rules
// ═══════════════════════════════════════════════════════════════

router.get(
  '/rules',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { platform, status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from('automation_rules')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (platform && platform !== 'all') {
      // automation_rules stores platforms as an array; use cs (contains)
      query = query.contains('platforms', [platform as string]);
    }
    if (status) {
      query = query.eq('status', status as string);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/rules — Create rule
// ═══════════════════════════════════════════════════════════════

router.post(
  '/rules',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const schema = z.object({
      name: z.string().min(1, 'Rule name is required').max(200),
      description: z.string().max(2000).optional(),
      platform: z.enum(['meta', 'google', 'tiktok', 'snap', 'all']).default('meta'),
      ruleType: z
        .enum([
          'pause_if_cpa_exceeds',
          'scale_if_roas_exceeds',
          'alert_if_ctr_drops',
          'reduce_budget_if_spend_high',
          'pause_if_no_conversions',
          'adjust_bid_if_frequency_high',
          'custom',
        ])
        .default('custom'),
      conditions: z
        .array(
          z.object({
            metric: z.string(),
            operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'pct_change_gt']),
            value: z.number(),
            timeWindow: z.string().optional(),
          }),
        )
        .min(1, 'At least one condition is required'),
      actions: z
        .array(
          z.object({
            type: z.string(),
            params: z.record(z.unknown()).default({}),
          }),
        )
        .min(1, 'At least one action is required'),
      confidenceThreshold: z.number().min(0).max(1).default(0.7),
      autoExecute: z.boolean().default(false),
      notificationChannels: z.array(z.string()).default([]),
    });

    const body = schema.parse(req.body);

    // Convert platform to platforms array for DB compatibility
    const platforms =
      body.platform === 'all' ? ['meta', 'google', 'tiktok', 'snap'] : [body.platform];

    const insertRow = {
      workspace_id: workspaceId,
      name: body.name,
      description: body.description,
      platforms,
      rule_type: body.ruleType,
      conditions: body.conditions,
      actions: body.actions,
      confidence_threshold: body.confidenceThreshold,
      auto_execute: body.autoExecute,
      notification_channels: body.notificationChannels,
      status: 'active',
      applied_count: 0,
    };

    const { data, error } = await supabase
      .from('automation_rules')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      throw new AppError('RULE_CREATE_FAILED', `Failed to create rule: ${error.message}`, 500);
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'user',
      actor_id: req.user?.sub ?? null,
      actor_name: req.user?.email ?? 'unknown',
      action: `Created automation rule "${body.name}"`,
      action_category: 'rule_created',
      details: { rule_id: data.id, rule_type: body.ruleType },
      source: 'dashboard',
    });

    res.status(201).json({ success: true, data });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/rules/:id — Get single rule with execution history
// ═══════════════════════════════════════════════════════════════

router.get(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .single();

    if (error || !rule) throw new NotFoundError('Rule');

    // Fetch execution history from audit_log
    const { data: history, error: histError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or(`details->>rule_id.eq.${id},action_category.eq.rule_triggered`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (histError) throw histError;

    // Filter history client-side for precise rule_id matching
    const filteredHistory = (history ?? []).filter((entry) => {
      const details = entry.details as Record<string, unknown> | null;
      return details?.rule_id === id || entry.action_category === 'rule_triggered';
    });

    res.json({
      success: true,
      data: {
        ...rule,
        executionHistory: filteredHistory,
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// PUT /agent/rules/:id — Update rule
// ═══════════════════════════════════════════════════════════════

router.put(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    // Verify rule exists and belongs to workspace
    const { data: existing, error: findError } = await supabase
      .from('automation_rules')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .single();

    if (findError || !existing) throw new NotFoundError('Rule');

    const updateSchema = z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        platforms: z.array(z.enum(['meta', 'google', 'tiktok', 'snap'])).optional(),
        platform: z.enum(['meta', 'google', 'tiktok', 'snap', 'all']).optional(),
        rule_type: z.string().optional(),
        conditions: z
          .array(
            z.object({
              metric: z.string(),
              operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'pct_change_gt']),
              value: z.number(),
              timeWindow: z.string().optional(),
            }),
          )
          .optional(),
        actions: z
          .array(
            z.object({
              type: z.string(),
              params: z.record(z.unknown()).optional(),
            }),
          )
          .optional(),
        confidence_threshold: z.number().min(0).max(1).optional(),
        auto_execute: z.boolean().optional(),
        notification_channels: z.array(z.string()).optional(),
      })
      .strict();

    const body = updateSchema.parse(req.body);

    // Normalize platform → platforms if provided
    if (body.platform) {
      body.platforms =
        body.platform === 'all'
          ? ['meta', 'google', 'tiktok', 'snap']
          : [body.platform];
      delete (body as Record<string, unknown>).platform;
    }

    // Remove undefined fields
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await supabase
      .from('automation_rules')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError('RULE_UPDATE_FAILED', `Failed to update rule: ${error?.message}`, 500);
    }

    res.json({ success: true, data });
  }),
);

// ═══════════════════════════════════════════════════════════════
// DELETE /agent/rules/:id — Archive rule (soft delete)
// ═══════════════════════════════════════════════════════════════

router.delete(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data: existing, error: findError } = await supabase
      .from('automation_rules')
      .select('id, name')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .single();

    if (findError || !existing) throw new NotFoundError('Rule');

    const { error } = await supabase
      .from('automation_rules')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: req.user?.sub ?? null,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new AppError('RULE_ARCHIVE_FAILED', `Failed to archive rule: ${error.message}`, 500);
    }

    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'user',
      actor_id: req.user?.sub ?? null,
      actor_name: req.user?.email ?? 'unknown',
      action: `Archived automation rule "${existing.name}"`,
      action_category: 'rule_archived',
      details: { rule_id: id },
      source: 'dashboard',
    });

    res.json({ success: true, message: 'Rule archived' });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/rules/:id/toggle — Activate/pause rule
// ═══════════════════════════════════════════════════════════════

router.post(
  '/rules/:id/toggle',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .single();

    if (error || !rule) throw new NotFoundError('Rule');

    const currentStatus = rule.status as string;
    if (currentStatus === 'archived') {
      throw new ValidationError('Cannot toggle an archived rule. Restore it first.');
    }

    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    const { data: updated, error: updateError } = await supabase
      .from('automation_rules')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new AppError('RULE_TOGGLE_FAILED', `Failed to toggle rule: ${updateError?.message}`, 500);
    }

    res.json({
      success: true,
      data: updated,
      message: `Rule ${newStatus === 'active' ? 'activated' : 'paused'}`,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/logs — AI action logs
// ═══════════════════════════════════════════════════════════════

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const {
      campaignId,
      platform,
      status,
      page = '1',
      limit = '20',
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // ai_action_logs table holds AI action history
    let query = supabase
      .from('ai_action_logs')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId as string);
    }
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/insights — AI-generated insights
// ═══════════════════════════════════════════════════════════════

router.get(
  '/insights',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // Fetch stored insights from ai_insights table
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Format each insight
    const formatted = (insights ?? []).map((insight) => ({
      type: (insight.type as string) ?? 'general',
      title: (insight.title as string) ?? 'Untitled Insight',
      description: (insight.description as string) ?? '',
      impact: (insight.impact as string) ?? 'medium',
      confidence: (insight.confidence as number) ?? 0.7,
      relatedCampaigns: (insight.related_campaigns as string[]) ?? [],
      createdAt: insight.created_at,
    }));

    res.json({
      success: true,
      data: formatted,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/recommendations — Optimization recommendations
// ═══════════════════════════════════════════════════════════════

router.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const generator = new RecommendationGenerator();
    const recommendations = await generator.generateRecommendations(workspaceId);

    // Normalize to consistent API shape
    const formatted = recommendations.map((rec) => ({
      id: rec.id,
      type: rec.type,
      title: rec.title,
      description: rec.description,
      campaignId: rec.campaignIds[0] ?? null,
      platform: rec.platform,
      estimatedImpact: rec.estimatedImpact
        ? `${rec.estimatedImpact.direction === 'increase' ? '+' : '-'}${rec.estimatedImpact.magnitude}${rec.estimatedImpact.unit} ${rec.estimatedImpact.metric}`
        : 'Unknown',
      confidence: rec.confidence,
      priority: rec.priority,
      status: 'pending' as string,
      reasoning: rec.reasoning,
      createdAt: rec.createdAt,
      expiresAt: rec.expiresAt ?? null,
    }));

    res.json({
      success: true,
      data: formatted,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/recommendations/:id/execute — Create draft from recommendation
// ═══════════════════════════════════════════════════════════════

router.post(
  '/recommendations/:id/execute',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const generator = new RecommendationGenerator();
    const recommendations = await generator.generateRecommendations(workspaceId);
    const rec = recommendations.find((r) => r.id === id);

    if (!rec) throw new NotFoundError('Recommendation');

    // Map recommendation type to draft type
    const draftTypeMap: Record<string, DraftType> = {
      budget_reallocation: 'budget_change',
      creative_refresh: 'creative_upload',
      audience_optimization: 'targeting_edit',
      bid_adjustment: 'bid_adjustment',
      status_change: 'status_change',
      rule_suggestion: 'rule_based',
    };

    const draftType = draftTypeMap[rec.type] ?? 'rule_based';
    const campaignId = rec.campaignIds[0] ?? '';

    // Fetch campaign details for richer draft
    let campaignName = 'Unknown';
    let platform: Platform = rec.platform;
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('name, platform')
        .eq('id', campaignId)
        .single();
      if (campaign) {
        campaignName = campaign.name as string;
        platform = (campaign.platform as Platform) ?? rec.platform;
      }
    }

    const changeDetail: Record<string, unknown> = {
      recommendation_id: rec.id,
      recommendation_type: rec.type,
      campaign_ids: rec.campaignIds,
      reasoning: rec.reasoning,
    };

    // Add type-specific params
    if (rec.type === 'budget_reallocation') {
      const budgetRec = rec as {
        proposedAllocation?: Record<string, number>;
        currentAllocation?: Record<string, number>;
      };
      changeDetail.proposed_allocation = budgetRec.proposedAllocation ?? {};
      changeDetail.current_allocation = budgetRec.currentAllocation ?? {};
    }

    const draft = await createDraft({
      workspaceId,
      platform,
      campaignId: campaignId || undefined,
      draftType,
      changeSummary: `AI Recommendation: ${rec.title} — ${campaignName}`,
      changeDetail,
      aiReasoning: rec.reasoning,
      impactEstimate: rec.estimatedImpact
        ? `${rec.estimatedImpact.direction === 'increase' ? '+' : '-'}${rec.estimatedImpact.magnitude}${rec.estimatedImpact.unit} ${rec.estimatedImpact.metric}`
        : undefined,
      actorType: 'ai',
      actorName: 'AI Recommendation Engine',
    });

    // Log
    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'ai',
      actor_name: 'AI Recommendation Engine',
      action: `Created draft from recommendation "${rec.title}"`,
      action_category: 'recommendation_executed',
      campaign_id: campaignId || null,
      details: { recommendation_id: rec.id, draft_id: draft.id },
      source: 'ai_agent',
    });

    res.status(201).json({
      success: true,
      data: draft,
      message: 'Draft created from recommendation',
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/creative-fatigue — Creative fatigue scores
// ═══════════════════════════════════════════════════════════════

router.get(
  '/creative-fatigue',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const detector = new CreativeFatigueDetector();
    const scores = await detector.calculateFatigueScores(workspaceId);

    // Fetch campaign and platform info for each score
    const campaignIds = [...new Set(scores.map((s) => s.campaignId))];
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, platform')
      .in('id', campaignIds);

    const campaignMap = new Map(
      (campaigns ?? []).map((c) => [c.id as string, c as Record<string, unknown>]),
    );

    // Format response
    const formatted = scores.map((score) => {
      const campaign = campaignMap.get(score.campaignId);
      return {
        adId: score.adId,
        adName: score.adName,
        campaignId: score.campaignId,
        platform: (campaign?.platform as string) ?? 'meta',
        fatigueScore: score.score,
        status: score.status,
        daysSinceLaunch: score.daysSinceLaunch,
        trend: score.ctrDecayRate > 0.5 ? 'declining' : score.ctrDecayRate < -0.2 ? 'improving' : 'stable',
        details: {
          ctrDecayRate: score.ctrDecayRate,
          frequencyGrowthRate: score.frequencyGrowthRate,
          conversionRateDecline: score.conversionRateDecline,
          estimatedDaysUntilFatigue: score.estimatedDaysUntilFatigue,
        },
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/pause — Pause the AI agent
// ═══════════════════════════════════════════════════════════════

router.post(
  '/pause',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user?.sub ?? 'unknown';

    const state = getAgentState(workspaceId);
    state.isRunning = false;
    state.pausedAt = new Date().toISOString();
    state.pausedBy = userId;

    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'user',
      actor_id: userId,
      actor_name: req.user?.email ?? 'unknown',
      action: 'AI Agent paused',
      action_category: 'agent_paused',
      details: { paused_at: state.pausedAt },
      source: 'dashboard',
    });

    res.json({
      success: true,
      message: 'AI Agent paused',
      data: { isRunning: false, pausedAt: state.pausedAt },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/resume — Resume the AI agent
// ═══════════════════════════════════════════════════════════════

router.post(
  '/resume',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user?.sub ?? 'unknown';

    const state = getAgentState(workspaceId);
    state.isRunning = true;
    state.pausedAt = null;
    state.pausedBy = null;
    state.nextRunAt = new Date(Date.now() + 15 * 60_000).toISOString();

    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'user',
      actor_id: userId,
      actor_name: req.user?.email ?? 'unknown',
      action: 'AI Agent resumed',
      action_category: 'agent_resumed',
      details: { resumed_at: new Date().toISOString() },
      source: 'dashboard',
    });

    res.json({
      success: true,
      message: 'AI Agent resumed',
      data: { isRunning: true, nextRunAt: state.nextRunAt },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// GET /agent/morning-brief — Generate morning brief data
// ═══════════════════════════════════════════════════════════════

router.get(
  '/morning-brief',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // Fetch active campaigns with metrics
    const { data: accounts, error: acctErr } = await supabase
      .from('ad_accounts')
      .select('id, platform')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');
    if (acctErr) throw acctErr;

    const accountIds = (accounts ?? []).map((a) => a.id);
    const accountPlatforms = new Map(
      (accounts ?? []).map((a) => [a.id as string, a.platform as string]),
    );

    let campaigns: Array<Record<string, unknown>> = [];
    if (accountIds.length > 0) {
      const { data: campaignsData, error: campErr } = await supabase
        .from('campaigns')
        .select('*')
        .in('ad_account_id', accountIds)
        .eq('status', 'active');
      if (campErr) throw campErr;
      campaigns = (campaignsData ?? []).map((c) => ({
        ...c,
        platform: accountPlatforms.get(c.ad_account_id as string) ?? 'meta',
      }));
    }

    // Aggregate KPIs
    const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (Number(c.conversions) || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (Number(c.spend) || 0) * (Number(c.roas) || 0), 0);
    const weightedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const totalClicks = campaigns.reduce((s, c) => s + (Number(c.clicks) || 0), 0);
    const totalImpressions = campaigns.reduce((s, c) => s + (Number(c.impressions) || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Top movers (best and worst performers by ROAS change)
    const campaignsWithRoas = campaigns
      .filter((c) => Number(c.roas) > 0)
      .sort((a, b) => (Number(b.roas) || 0) - (Number(a.roas) || 0));

    const topMovers = {
      winners: campaignsWithRoas.slice(0, 3).map((c) => ({
        campaignId: c.id as string,
        campaignName: (c.name as string) ?? 'Unknown',
        platform: (c.platform as string) ?? 'meta',
        metric: 'ROAS',
        value: Number(c.roas).toFixed(2) + 'x',
        change: '+0%',
      })),
      losers: campaignsWithRoas.slice(-3).reverse().map((c) => ({
        campaignId: c.id as string,
        campaignName: (c.name as string) ?? 'Unknown',
        platform: (c.platform as string) ?? 'meta',
        metric: 'ROAS',
        value: Number(c.roas).toFixed(2) + 'x',
        change: '-0%',
      })),
    };

    // Recommendations from generator
    const generator = new RecommendationGenerator();
    const recommendations = await generator.generateRecommendations(workspaceId);
    const topRecs = recommendations.slice(0, 5).map((rec) => ({
      id: rec.id,
      type: rec.type,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      confidence: rec.confidence,
      estimatedImpact: rec.estimatedImpact
        ? `${rec.estimatedImpact.direction === 'increase' ? '+' : '-'}${rec.estimatedImpact.magnitude}${rec.estimatedImpact.unit}`
        : 'Unknown',
    }));

    // Alerts from notifications
    const { data: alertsData } = await supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'unread')
      .order('created_at', { ascending: false })
      .limit(5);

    const alerts = (alertsData ?? []).map((a) => ({
      severity: (a.severity as string) ?? 'info',
      title: (a.title as string) ?? 'Alert',
      description: (a.message as string) ?? '',
      campaignName: ((a.data as Record<string, unknown>)?.campaign_name as string) ?? undefined,
    }));

    // Build response
    const now = new Date();
    const greeting = getGreeting(now);
    const brief = {
      greeting,
      date: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      summary: `Across ${campaigns.length} active campaigns, you're spending $${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })} with a ${weightedRoas.toFixed(2)}x ROAS. ${totalConversions.toLocaleString()} conversions at $${avgCpa.toFixed(2)} CPA.`,
      kpis: {
        spend: { value: Math.round(totalSpend), change: 0 },
        roas: { value: parseFloat(weightedRoas.toFixed(2)), change: 0 },
        conversions: { value: totalConversions, change: 0 },
        cpa: { value: parseFloat(avgCpa.toFixed(2)), change: 0 },
        ctr: { value: parseFloat(avgCtr.toFixed(2)), change: 0 },
        impressions: { value: totalImpressions, change: 0 },
      },
      topMovers,
      recommendations: topRecs,
      schedule: {
        nextRuleEvaluation: new Date(Date.now() + 15 * 60_000).toISOString(),
        nextBriefGeneration: getNextBriefTime(now),
      },
      alerts,
    };

    res.json({
      success: true,
      data: brief,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// POST /agent/run-now — Trigger immediate rule evaluation
// ═══════════════════════════════════════════════════════════════

router.post(
  '/run-now',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const state = getAgentState(workspaceId);
    if (!state.isRunning) {
      throw new AppError('AGENT_PAUSED', 'AI Agent is currently paused. Resume it first.', 409);
    }

    // Use the newer RuleEvaluator from ai-engine
    const evaluator = new RuleEvaluator();
    const results = await evaluator.evaluateRules(workspaceId);

    const triggered = results.filter((r) => r.triggered).length;
    const drafts = results.reduce((sum, r) => sum + r.draftsCreated.length, 0);

    state.lastRunAt = new Date().toISOString();
    state.nextRunAt = new Date(Date.now() + 15 * 60_000).toISOString();

    res.json({
      success: true,
      data: {
        rulesChecked: results.length,
        triggered,
        draftsCreated: drafts,
        results: results.map((r) => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          triggered: r.triggered,
          matchedCampaigns: r.matchedCampaigns.length,
          draftsCreated: r.draftsCreated.length,
        })),
      },
      message: `Evaluated ${results.length} rules: ${triggered} triggered, ${drafts} drafts created`,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getNextBriefTime(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);
  return tomorrow.toISOString();
}

export default router;
