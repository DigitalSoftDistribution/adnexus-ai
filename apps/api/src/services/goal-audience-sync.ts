import { supabase } from '../lib/supabase';

export interface GoalRecord {
  id: string;
  workspace_id: string;
  name: string;
  goal_type: 'roas' | 'cpa' | 'ctr' | 'spend' | 'conversions' | 'custom';
  platform?: string;
  target_value: number;
  baseline_value?: number;
  current_value: number;
  unit?: string;
  start_date: string;
  end_date: string;
  campaign_ids?: string[];
  alert_when: 'at_risk' | 'off_track' | 'never';
  target_audience?: TargetAudienceConfig;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TargetAudienceConfig {
  segment_id?: string;
  platform?: string;
  type?: string;
  targeting?: Record<string, unknown>;
}

export interface AudienceRecord {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  platform: string;
  status: string;
  estimated_reach: number;
  targeting: Record<string, unknown>;
  source_goal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  goal_id: string;
  audience_id?: string;
  action: 'created' | 'updated' | 'noop';
  details: string;
}

/**
 * Sync a goal to its target audience segment.
 *
 * When a goal specifies a target_audience, this creates or updates
 * a matching audience record that represents the segment the goal
 * is targeting.
 */
export async function syncGoalToAudience(goal: GoalRecord): Promise<SyncResult> {
  if (!goal.target_audience) {
    return { goal_id: goal.id, action: 'noop', details: 'No target audience configured' };
  }

  const audienceTargeting = goal.target_audience.targeting ?? {};
  const platform = goal.target_audience.platform || goal.platform || 'meta';
  const audienceType = goal.target_audience.type || 'custom';
  const audienceName = `${goal.name} — Target Audience`;

  const existing = await findAudienceByGoalId(goal.id);

  if (existing) {
    const { data, error } = await supabase
      .from('audiences')
      .update({
        name: audienceName,
        type: audienceType,
        platform,
        targeting: audienceTargeting,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update audience: ${error.message}`);
    return { goal_id: goal.id, audience_id: data.id, action: 'updated', details: `Updated audience ${data.id}` };
  }

  const { data, error } = await supabase
    .from('audiences')
    .insert({
      workspace_id: goal.workspace_id,
      name: audienceName,
      type: audienceType,
      platform,
      status: 'active',
      estimated_reach: 0,
      targeting: audienceTargeting,
      source_goal_id: goal.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create audience: ${error.message}`);
  return { goal_id: goal.id, audience_id: data.id, action: 'created', details: `Created audience ${data.id}` };
}

/**
 * Trigger audience population when a goal status changes to 'active'.
 *
 * This kicks off the audience population pipeline — in production this
 * would fan out to platform APIs (Meta custom audiences, Google RLSA, etc.)
 */
export async function populateAudienceForActiveGoal(goal: GoalRecord): Promise<SyncResult> {
  if (goal.status !== 'active') {
    return { goal_id: goal.id, action: 'noop', details: `Goal status is '${goal.status}', not active` };
  }
  if (!goal.target_audience) {
    return { goal_id: goal.id, action: 'noop', details: 'No target audience configured' };
  }

  const syncResult = await syncGoalToAudience(goal);
  if (!syncResult.audience_id) return syncResult;

  const { error } = await supabase
    .from('audiences')
    .update({ status: 'active' })
    .eq('id', syncResult.audience_id);

  if (error) throw new Error(`Failed to activate audience: ${error.message}`);

  return {
    goal_id: goal.id,
    audience_id: syncResult.audience_id,
    action: 'updated',
    details: `Audience ${syncResult.audience_id} activated for population`,
  };
}

/**
 * Aggregate daily trends for a goal's linked audiences.
 *
 * Pulls campaign_metrics for the campaigns linked to the goal's audiences
 * and builds a daily trend of key metrics.
 */
export async function aggregateDailyTrendsForGoal(
  goalId: string,
  workspaceId: string,
  startDate?: string,
  endDate?: string,
) {
  const start = startDate ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const end = endDate ?? new Date().toISOString().slice(0, 10);

  const { data: audiences } = await supabase
    .from('audiences')
    .select('id')
    .eq('source_goal_id', goalId)
    .eq('workspace_id', workspaceId);

  if (!audiences?.length) return [];

  const audienceIds = audiences.map((a) => a.id);

  const { data: metrics } = await supabase
    .from('campaign_metrics')
    .select('date, impressions, clicks, conversions, spend, ctr, reach, frequency')
    .in('audience_id', audienceIds)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (!metrics?.length) return [];

  const byDate = new Map<string, {
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }>();

  for (const row of metrics) {
    const existing = byDate.get(row.date);
    if (existing) {
      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.clicks ?? 0;
      existing.conversions += row.conversions ?? 0;
      existing.spend += row.spend ?? 0;
    } else {
      byDate.set(row.date, {
        date: row.date,
        impressions: row.impressions ?? 0,
        clicks: row.clicks ?? 0,
        conversions: row.conversions ?? 0,
        spend: row.spend ?? 0,
      });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Find an existing audience linked to a goal */
async function findAudienceByGoalId(goalId: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('audiences')
    .select('id')
    .eq('source_goal_id', goalId)
    .single();

  return data ?? null;
}

/**
 * Fetch a goal record by ID (used by the sync endpoint).
 */
export async function getGoalById(goalId: string, workspaceId: string): Promise<GoalRecord | null> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('workspace_id', workspaceId)
    .single();

  return data ?? null;
}
