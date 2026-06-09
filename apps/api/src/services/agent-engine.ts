import { supabase } from '../lib/supabase';
import { createDraft } from './drafts-service';
import { getModuleLogger } from '../lib/logger';
import type { AutomationRule, DraftType, Platform } from '../types';

const logger = getModuleLogger('agent-engine');

// ─── Evaluate All Rules ──────────────────────────────────────

export async function evaluateRules(workspaceId: string): Promise<{ triggered: number; drafts: number }> {
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  let triggered = 0;
  let drafts = 0;

  for (const rule of (rules ?? []) as AutomationRule[]) {
    try {
      const wasTriggered = await evaluateSingleRule(workspaceId, rule);
      if (wasTriggered) {
        triggered++;
        drafts += 1;
      }
    } catch (err) {
      logger.error({ ruleId: rule.id, err }, `Rule ${rule.id} failed`);
    }
  }

  return { triggered, drafts };
}

// ─── Evaluate Single Rule ────────────────────────────────────

async function evaluateSingleRule(workspaceId: string, rule: AutomationRule): Promise<boolean> {
  // Fetch campaigns for this workspace
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, platform')
    .eq('workspace_id', workspaceId)
    .in('platform', rule.platforms);

  if (!accounts?.length) return false;

  const accountIds = accounts.map((a) => a.id);

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .in('ad_account_id', accountIds)
    .eq('status', 'active');

  if (!campaigns?.length) return false;

  let anyTriggered = false;

  for (const campaign of campaigns) {
    const allConditionsMet = rule.conditions.every((condition) =>
      checkCondition(condition, campaign),
    );

    if (allConditionsMet) {
      anyTriggered = true;

      // Execute actions
      for (const action of rule.actions) {
        await executeAction(workspaceId, rule, campaign, action, accounts.find((a) => a.id === campaign.ad_account_id)?.platform ?? 'meta');
      }

      // Increment applied count
      await supabase
        .from('automation_rules')
        .update({
          applied_count: rule.applied_count + 1,
          last_applied_at: new Date().toISOString(),
        })
        .eq('id', rule.id);
    }
  }

  return anyTriggered;
}

// ─── Check Single Condition ──────────────────────────────────

function checkCondition(condition: { metric: string; operator: string; value: number }, campaign: Record<string, unknown>): boolean {
  const value = getCampaignMetric(campaign, condition.metric);
  if (value === undefined) return false;

  switch (condition.operator) {
    case 'gt': return value > condition.value;
    case 'lt': return value < condition.value;
    case 'gte': return value >= condition.value;
    case 'lte': return value <= condition.value;
    case 'eq': return value === condition.value;
    case 'pct_change_gt': {
      // Would need historical data — simplified
      return false;
    }
    default: return false;
  }
}

function getCampaignMetric(campaign: Record<string, unknown>, metric: string): number | undefined {
  switch (metric) {
    case 'cpa': return campaign.cpa as number;
    case 'roas': return campaign.roas as number;
    case 'ctr': return campaign.ctr as number;
    case 'frequency': return campaign.frequency as number;
    case 'spend_pct': {
      const budget = (campaign.daily_budget as number) || (campaign.lifetime_budget as number);
      if (!budget || budget === 0) return undefined;
      return ((campaign.spend as number) / budget) * 100;
    }
    default: return undefined;
  }
}

// ─── Execute Action ──────────────────────────────────────────

async function executeAction(
  workspaceId: string,
  rule: AutomationRule,
  campaign: Record<string, unknown>,
  action: { type: string; params: Record<string, unknown> },
  platform: string,
): Promise<void> {
  const draftTypeMap: Record<string, DraftType> = {
    pause_campaign: 'status_change',
    increase_budget: 'budget_change',
    decrease_budget: 'budget_change',
    adjust_bid: 'bid_adjustment',
    create_draft: 'rule_based',
  };

  const draftType = draftTypeMap[action.type] ?? 'rule_based';

  const changeDetail: Record<string, unknown> = {
    platform_campaign_id: campaign.platform_campaign_id,
    rule_name: rule.name,
    rule_id: rule.id,
  };

  let changeSummary = `${rule.name}: action on ${campaign.name}`;

  switch (action.type) {
    case 'pause_campaign':
      changeSummary = `Pause "${campaign.name}" — ${rule.name}`;
      changeDetail.field = 'status';
      changeDetail.old_status = campaign.status;
      changeDetail.new_status = 'PAUSED';
      break;

    case 'increase_budget': {
      const pct = (action.params.percentage as number) ?? 20;
      const currentBudget = (campaign.daily_budget as number) || 0;
      const newBudget = currentBudget * (1 + pct / 100);
      changeSummary = `Increase "${campaign.name}" budget by ${pct}% ($${currentBudget} → $${newBudget.toFixed(0)})`;
      changeDetail.field = 'daily_budget';
      changeDetail.old_value = currentBudget;
      changeDetail.new_value = Math.round(newBudget);
      break;
    }

    case 'decrease_budget': {
      const pct = (action.params.percentage as number) ?? 20;
      const currentBudget = (campaign.daily_budget as number) || 0;
      const newBudget = currentBudget * (1 - pct / 100);
      changeSummary = `Decrease "${campaign.name}" budget by ${pct}% ($${currentBudget} → $${newBudget.toFixed(0)})`;
      changeDetail.field = 'daily_budget';
      changeDetail.old_value = currentBudget;
      changeDetail.new_value = Math.round(newBudget);
      break;
    }

    default:
      changeSummary = `${action.type} on "${campaign.name}" via ${rule.name}`;
  }

  // Build AI reasoning
  const conditionDescriptions = rule.conditions.map(
    (c) => `${c.metric} ${c.operator} ${c.value}`,
  );
  const aiReasoning = `Rule "${rule.name}" triggered because: ${conditionDescriptions.join(' AND ')}. ${action.type} action was executed.`;

  await createDraft({
    workspaceId,
    platform: platform as Platform,
    campaignId: campaign.id as string,
    draftType,
    changeSummary,
    changeDetail,
    aiReasoning,
    actorType: 'ai',
    actorName: 'AI Agent',
    ruleId: rule.id,
  });
}

// ─── Run Single Check (for manual trigger) ───────────────────

export async function runRuleCheck(ruleId: string): Promise<boolean> {
  const { data: rule } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (!rule) return false;

  return evaluateSingleRule(rule.workspace_id, rule as AutomationRule);
}
