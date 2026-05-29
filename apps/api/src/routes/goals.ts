import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../lib/errors';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('workspace_id', req.workspaceId!)
    .order('created_at', { ascending: false });
  res.json({ success: true, data: data ?? [] });
}));

router.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({
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
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('goals').insert({
    workspace_id: req.workspaceId!,
    ...body,
    current_value: body.baseline_value ?? 0,
  }).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, data });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('goals').update(req.body).eq('id', req.params.id).eq('workspace_id', req.workspaceId!).select().single();
  if (error || !data) throw new NotFoundError('Goal');
  res.json({ success: true, data });
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

export default router;
