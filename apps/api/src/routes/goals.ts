import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../lib/errors';
import {
  syncGoalToAudience,
  populateAudienceForActiveGoal,
  aggregateDailyTrendsForGoal,
  getGoalById,
} from '../services/goal-audience-sync';

const router = Router();

const goalCreateSchema = z.object({
  name: z.string().min(1),
  goal_type: z.enum(['roas', 'cpa', 'ctr', 'spend', 'conversions', 'custom']),
  platform: z.string().optional(),
  target_value: z.number(),
  baseline_value: z.number().optional(),
  unit: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  campaign_ids: z.array(z.string()).optional(),
  alert_when: z.enum(['at_risk', 'off_track', 'never']).default('at_risk'),
  target_audience: z.object({
    segment_id: z.string().optional(),
    platform: z.string().optional(),
    type: z.string().optional(),
    targeting: z.record(z.unknown()).optional(),
  }).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('workspace_id', req.workspaceId!)
    .order('created_at', { ascending: false });
  res.json({ success: true, data: data ?? [] });
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = goalCreateSchema.parse(req.body);
  const { data, error } = await supabase.from('goals').insert({
    workspace_id: req.workspaceId!,
    ...body,
    current_value: body.baseline_value ?? 0,
  }).select().single();
  if (error) throw error;

  // Sync goal to audience if target_audience is configured
  let syncResult = null;
  if (data.target_audience) {
    syncResult = await syncGoalToAudience(data);
  }

  res.status(201).json({ success: true, data, sync: syncResult });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('workspace_id', req.workspaceId!)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Goal');

  // Sync audience on update
  let syncResult = null;
  if (data.target_audience) {
    syncResult = await syncGoalToAudience(data);
  }

  // If status changed to active, trigger population
  let populateResult = null;
  if (data.status === 'active' && data.target_audience) {
    populateResult = await populateAudienceForActiveGoal(data);
  }

  res.json({ success: true, data, sync: syncResult, populate: populateResult });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await supabase.from('goals').delete().eq('id', req.params.id);
  res.json({ success: true });
}));

router.get('/:id/progress', asyncHandler(async (req, res) => {
  const { data: goal } = await supabase.from('goals').select('*').eq('id', req.params.id).single();
  if (!goal) throw new NotFoundError('Goal');

  const progress = goal.target_value > 0 ? Math.min(100, ((goal.current_value / goal.target_value) * 100)) : 0;

  res.json({
    success: true,
    data: {
      goal,
      progress_pct: progress.toFixed(1),
      status: progress >= 100 ? 'completed' : progress >= 80 ? 'on_track' : progress >= 50 ? 'at_risk' : 'off_track',
    },
  });
}));

// POST /goals/:id/sync-audience — manual sync trigger
router.post('/:id/sync-audience', asyncHandler(async (req, res) => {
  const workspaceId = req.workspaceId!;
  const goal = await getGoalById(req.params.id, workspaceId);
  if (!goal) throw new NotFoundError('Goal');

  const syncResult = await syncGoalToAudience(goal);

  // Also aggregate daily trends if audience exists
  let trends = null;
  if (syncResult.audience_id) {
    trends = await aggregateDailyTrendsForGoal(goal.id, workspaceId);
  }

  res.json({
    success: true,
    data: {
      sync: syncResult,
      trends: trends ?? [],
    },
  });
}));

export default router;
