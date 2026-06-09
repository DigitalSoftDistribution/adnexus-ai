import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { createDraft } from '../services/drafts-service';
import { broadcastToWorkspace, createNotification } from '../services/notification-service';
import type { AutomationRule, RuleCondition, RuleAction, Platform } from '../types';
import { getModuleLogger } from "../lib/logger";

const logger = getModuleLogger('rule-evaluator');

// ─── Redis Connection ──────────────────────────────────────

function getRedisConnection(): Redis {
  if (!config.redis.url) {
    throw new Error('Redis URL is not configured. Set REDIS_URL environment variable.');
  }
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

const redisConnection = getRedisConnection();

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redisConnection.on('connect', () => {
  logger.info('Redis connected');
});

// ─── Queue Configuration ───────────────────────────────────

export const ruleEvaluatorQueue = new Queue('rule-evaluation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ─── Campaign Type (local extension of UnifiedCampaign) ────

interface Campaign {
  id: string;
  ad_account_id: string;
  platform: Platform;
  platform_campaign_id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_type?: 'daily' | 'lifetime';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

// ─── Evaluation Summary ────────────────────────────────────

interface EvaluationSummary {
  rulesChecked: number;
  campaignsChecked: number;
  draftsCreated: number;
  rulesTriggered: number;
}

// ─── Worker ────────────────────────────────────────────────

export const ruleEvaluatorWorker = new Worker(
  'rule-evaluation',
  async (job: Job) => {
    const { workspaceId } = job.data as { workspaceId: string };
    logger.info({ workspaceId: workspaceId, id: job.id }, 'Evaluating rules for workspace %s (job %s)', workspaceId, job.id);

    const summary: EvaluationSummary = {
      rulesChecked: 0,
      campaignsChecked: 0,
      draftsCreated: 0,
      rulesTriggered: 0,
    };

    try {
      // 1. Fetch active rules for workspace
      const { data: rules, error: rulesError } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      if (rulesError) {
        logger.error({ workspaceId, err: rulesError }, 'Failed to fetch rules for workspace %s: %s', workspaceId, rulesError.message);
        return summary;
      }

      const activeRules = (rules ?? []) as AutomationRule[];
      summary.rulesChecked = activeRules.length;

      if (activeRules.length === 0) {
        logger.info({ workspaceId: workspaceId }, 'No active rules for workspace %s', workspaceId);
        return summary;
      }

      // 2. Fetch all active campaigns for workspace (across all connected ad accounts)
      const { data: accounts, error: accountsError } = await supabase
        .from('ad_accounts')
        .select('id, platform')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      if (accountsError) {
        logger.error({ workspaceId, err: accountsError }, 'Failed to fetch ad accounts for workspace %s: %s', workspaceId, accountsError.message);
        return summary;
      }

      if (!accounts || accounts.length === 0) {
        logger.info({ workspaceId: workspaceId }, 'No active ad accounts for workspace %s', workspaceId);
        return summary;
      }

      const accountIds = accounts.map((a) => a.id);
      const accountMap = new Map(accounts.map((a) => [a.id, a.platform as Platform]));

      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .in('ad_account_id', accountIds)
        .eq('status', 'active');

      if (campaignsError) {
        logger.error({ workspaceId, err: campaignsError }, 'Failed to fetch campaigns for workspace %s: %s', workspaceId, campaignsError.message);
        return summary;
      }

      const activeCampaigns = (campaigns ?? []) as unknown as Campaign[];
      summary.campaignsChecked = activeCampaigns.length;

      if (activeCampaigns.length === 0) {
        logger.info({ workspaceId: workspaceId }, 'No active campaigns for workspace %s', workspaceId);
        return summary;
      }

      // 3. For each rule: check each campaign against conditions
      for (const rule of activeRules) {
        try {
          const ruleDrafts = await evaluateRuleForWorkspace(
            workspaceId,
            rule,
            activeCampaigns,
            accountMap,
          );

          if (ruleDrafts > 0) {
            summary.rulesTriggered += 1;
            summary.draftsCreated += ruleDrafts;

            // Update rule stats
            await supabase
              .from('automation_rules')
              .update({
                applied_count: (rule.applied_count || 0) + 1,
                last_applied_at: new Date().toISOString(),
              })
              .eq('id', rule.id);
          }
        } catch (ruleErr) {
          logger.error({ ruleId: rule.id, ruleName: rule.name, workspaceId, err: ruleErr }, 'Rule failed for workspace');
          // Continue with other rules — one rule failure doesn't stop others
        }
      }

      logger.info({ workspaceId: workspaceId, rulesChecked: summary.rulesChecked, campaignsChecked: summary.campaignsChecked, rulesTriggered: summary.rulesTriggered, draftsCreated: summary.draftsCreated }, 'Workspace %s complete: %s rules, %s campaigns, %s triggered, %s drafts created', workspaceId, summary.rulesChecked, summary.campaignsChecked, summary.rulesTriggered, summary.draftsCreated);

      return summary;
    } catch (err) {
      logger.error({ workspaceId, err }, 'Fatal error evaluating workspace');
      throw err; // Re-throw so BullMQ can handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 workspaces in parallel
  },
);

// ─── Rule Evaluation ───────────────────────────────────────

async function evaluateRuleForWorkspace(
  workspaceId: string,
  rule: AutomationRule,
  campaigns: Campaign[],
  accountMap: Map<string, Platform>,
): Promise<number> {
  let draftsCreated = 0;

  for (const campaign of campaigns) {
    try {
      // Skip campaigns on platforms not covered by this rule
      const campaignPlatform = accountMap.get(campaign.ad_account_id);
      if (!campaignPlatform || !rule.platforms.includes(campaignPlatform)) {
        continue;
      }

      // Evaluate conditions (AND logic by default, OR if specified)
      const conditionsMatch = evaluateConditions(rule.conditions, campaign);

      if (conditionsMatch) {
        // Execute all actions for this rule
        for (const action of rule.actions) {
          await executeAction(workspaceId, action, campaign, rule, campaignPlatform);
          if (action.type !== 'create_alert' && action.type !== 'notify_team') {
            draftsCreated += 1;
          }
        }

        // Log to audit_log
        await supabase.from('audit_log').insert({
          workspace_id: workspaceId,
          actor_type: 'system',
          actor_name: 'Rule Evaluator',
          action: `Rule "${rule.name}" triggered on campaign "${campaign.name}"`,
          action_category: 'rule_triggered',
          platform: campaignPlatform,
          campaign_id: campaign.id,
          details: {
            rule_id: rule.id,
            rule_name: rule.name,
            conditions: rule.conditions,
            actions: rule.actions.map((a) => a.type),
          },
          source: 'rule_engine',
        });
      }
    } catch (campaignErr) {
      logger.error({ ruleId: rule.id, campaignId: campaign.id, campaignName: campaign.name, err: campaignErr }, 'Error evaluating rule %s on campaign %s (%s)', rule.id, campaign.id, campaign.name);
      // Continue with other campaigns — one failure doesn't stop the rule
    }
  }

  return draftsCreated;
}

// ─── Condition Evaluation Engine ───────────────────────────

/**
 * Evaluate all conditions against a campaign.
 * Supports AND logic (default) and OR logic if specified on the rule.
 */
function evaluateConditions(conditions: RuleCondition[], campaign: Campaign): boolean {
  if (!conditions || conditions.length === 0) return true;

  // Check if the first condition specifies logic — if so, apply it
  // Default to AND: all conditions must match
  const logic = (conditions[0] as unknown as Record<string, unknown>)?.logic === 'or' ? 'or' : 'and';

  if (logic === 'or') {
    return conditions.some((condition) => evaluateSingleCondition(condition, campaign));
  }

  return conditions.every((condition) => evaluateSingleCondition(condition, campaign));
}

/**
 * Evaluate a single condition against a campaign.
 * Supports both metric+operator style and condition_type style.
 */
function evaluateSingleCondition(condition: RuleCondition, campaign: Campaign): boolean {
  // Handle legacy metric+operator style
  if (condition.metric && condition.operator) {
    return evaluateLegacyCondition(condition, campaign);
  }

  // Handle condition_type style (from spec)
  const conditionType = (condition as unknown as Record<string, unknown>).condition_type as string;
  if (conditionType) {
    return evaluateTypedCondition(conditionType, condition.value, campaign);
  }

  return false;
}

/**
 * Evaluate legacy metric+operator conditions (used by existing rules).
 */
function evaluateLegacyCondition(condition: RuleCondition, campaign: Campaign): boolean {
  const value = getCampaignMetricValue(campaign, condition.metric);
  if (value === undefined || value === null) return false;

  switch (condition.operator) {
    case 'gt':
      return value > condition.value;
    case 'lt':
      return value < condition.value;
    case 'gte':
      return value >= condition.value;
    case 'lte':
      return value <= condition.value;
    case 'eq':
      return value === condition.value;
    case 'ne':
      return value !== condition.value;
    case 'pct_change_gt':
      // Requires historical data — simplified, always false
      return false;
    default:
      return false;
  }
}

/**
 * Evaluate typed conditions as specified in the task requirements.
 * Condition types: 'spend_gt' | 'spend_lt' | 'roas_gt' | 'roas_lt' | 'cpa_gt' | 'cpa_lt'
 * | 'ctr_gt' | 'ctr_lt' | 'status_eq' | 'status_ne' | 'budget_utilization_gt' | 'frequency_gt'
 * | 'conversions_lt' | 'cost_per_result_gt' | 'days_running_gt' | 'impressions_gt'
 * | 'clicks_lt' | 'conversion_rate_lt'
 */
function evaluateTypedCondition(conditionType: string, threshold: number, campaign: Campaign): boolean {
  switch (conditionType) {
    // Spend conditions
    case 'spend_gt':
      return campaign.spend > threshold;
    case 'spend_lt':
      return campaign.spend < threshold;

    // ROAS conditions
    case 'roas_gt':
      return (campaign.roas ?? 0) > threshold;
    case 'roas_lt':
      return (campaign.roas ?? 0) < threshold;

    // CPA conditions
    case 'cpa_gt':
      return (campaign.cpa ?? 0) > threshold;
    case 'cpa_lt':
      return (campaign.cpa ?? 0) < threshold;

    // CTR conditions
    case 'ctr_gt':
      return (campaign.ctr ?? 0) > threshold;
    case 'ctr_lt':
      return (campaign.ctr ?? 0) < threshold;

    // Status conditions
    case 'status_eq':
      return campaign.status === String(threshold);
    case 'status_ne':
      return campaign.status !== String(threshold);

    // Budget utilization: spend / budget * 100
    case 'budget_utilization_gt': {
      const budget = campaign.daily_budget || campaign.lifetime_budget || 0;
      if (!budget || budget === 0) return false;
      return (campaign.spend / budget) * 100 > threshold;
    }

    // Frequency
    case 'frequency_gt':
      return (campaign.frequency ?? 0) > threshold;

    // Conversions
    case 'conversions_lt':
      return (campaign.conversions ?? 0) < threshold;

    // Cost per result (alias for CPA)
    case 'cost_per_result_gt':
      return (campaign.cpa ?? 0) > threshold;

    // Days running since start_date
    case 'days_running_gt': {
      if (!campaign.start_date) return false;
      const start = new Date(campaign.start_date);
      const now = new Date();
      const daysRunning = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return daysRunning > threshold;
    }

    // Impressions
    case 'impressions_gt':
      return (campaign.impressions ?? 0) > threshold;

    // Clicks
    case 'clicks_lt':
      return (campaign.clicks ?? 0) < threshold;

    // Conversion rate: conversions / clicks * 100
    case 'conversion_rate_lt': {
      if (!campaign.clicks || campaign.clicks === 0) return false;
      return (campaign.conversions / campaign.clicks) * 100 < threshold;
    }

    default:
      return false;
  }
}

/**
 * Get a numeric metric value from a campaign for legacy condition evaluation.
 */
function getCampaignMetricValue(campaign: Campaign, metric: string): number | undefined {
  switch (metric) {
    case 'cpa':
    case 'cost_per_result':
      return campaign.cpa;
    case 'roas':
      return campaign.roas;
    case 'ctr':
      return campaign.ctr;
    case 'frequency':
      return campaign.frequency;
    case 'spend':
      return campaign.spend;
    case 'impressions':
      return campaign.impressions;
    case 'clicks':
      return campaign.clicks;
    case 'conversions':
      return campaign.conversions;
    case 'spend_pct': {
      const budget = campaign.daily_budget || campaign.lifetime_budget || 0;
      if (!budget || budget === 0) return undefined;
      return (campaign.spend / budget) * 100;
    }
    default:
      return undefined;
  }
}

// ─── Action Execution ──────────────────────────────────────

/**
 * Execute a single rule action against a campaign.
 * ALL actions create DRAFTS (never direct changes to live campaigns).
 */
async function executeAction(
  workspaceId: string,
  action: RuleAction,
  campaign: Campaign,
  rule: AutomationRule,
  platform: Platform,
): Promise<void> {
  const actionType = action.type;
  const params = action.params || {};

  switch (actionType) {
    case 'pause_campaign': {
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'status_change',
        changeSummary: `Pause "${campaign.name}" — rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          field: 'status',
          old_value: campaign.status,
          new_value: 'paused',
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }

    case 'increase_budget': {
      const pct = (params.percentage as number) || (params.value as number) || 20;
      const currentBudget = campaign.daily_budget || 0;
      const newBudget = currentBudget * (1 + pct / 100);
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'budget_change',
        changeSummary: `Increase "${campaign.name}" budget by ${pct}% ($${currentBudget.toFixed(2)} → $${newBudget.toFixed(2)}) — rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          field: 'daily_budget',
          old_value: currentBudget,
          new_value: Math.round(newBudget),
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }

    case 'decrease_budget': {
      const pct = (params.percentage as number) || (params.value as number) || 20;
      const currentBudget = campaign.daily_budget || 0;
      const newBudget = currentBudget * (1 - pct / 100);
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'budget_change',
        changeSummary: `Decrease "${campaign.name}" budget by ${pct}% ($${currentBudget.toFixed(2)} → $${newBudget.toFixed(2)}) — rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          field: 'daily_budget',
          old_value: currentBudget,
          new_value: Math.round(newBudget),
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }

    case 'adjust_bid': {
      const bidAdjustment = (params.adjustment as number) || (params.value as number) || 10;
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'bid_adjustment',
        changeSummary: `Adjust bid for "${campaign.name}" by ${bidAdjustment > 0 ? '+' : ''}${bidAdjustment}% — rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          adjustment_pct: bidAdjustment,
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }

    case 'duplicate_campaign': {
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'campaign_duplicate',
        changeSummary: `Duplicate campaign "${campaign.name}" — rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          original_campaign_name: campaign.name,
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }

    case 'create_alert': {
      // Create notification only (no draft)
      const alertTitle = (params.title as string) || `Rule alert: ${rule.name}`;
      const alertMessage = (params.message as string) || `Rule "${rule.name}" triggered on "${campaign.name}"`;

      try {
        await broadcastToWorkspace(workspaceId, {
          workspaceId,
          type: 'rule_triggered',
          title: alertTitle,
          message: alertMessage,
          data: {
            rule_id: rule.id,
            rule_name: rule.name,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            platform,
          },
        });
      } catch (notifyErr) {
        logger.error({ ruleId: rule.id, err: notifyErr }, 'Failed to create alert for rule');
      }
      break;
    }

    case 'notify_team': {
      // Create notification + log for email delivery
      const notifyTitle = (params.title as string) || `Rule triggered: ${rule.name}`;
      const notifyMessage = (params.message as string) || `Rule "${rule.name}" triggered on campaign "${campaign.name}". A draft has been created for review.`;

      try {
        await broadcastToWorkspace(workspaceId, {
          workspaceId,
          type: 'rule_triggered',
          title: notifyTitle,
          message: notifyMessage,
          data: {
            rule_id: rule.id,
            rule_name: rule.name,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            platform,
            action_type: actionType,
          },
        });

        // Also create a targeted notification for immediate visibility
        await createNotification({
          workspaceId,
          type: 'rule_triggered',
          title: notifyTitle,
          message: notifyMessage,
          data: {
            rule_id: rule.id,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            platform,
          },
        });
      } catch (notifyErr) {
        logger.error({ ruleId: rule.id, err: notifyErr }, 'Failed to notify team for rule');
      }
      break;
    }

    default: {
      // Unknown action type — create a generic rule-based draft
      await createDraft({
        workspaceId,
        platform,
        campaignId: campaign.id,
        draftType: 'rule_based',
        changeSummary: `${actionType} on "${campaign.name}" via rule "${rule.name}"`,
        changeDetail: {
          platform_campaign_id: campaign.platform_campaign_id,
          action_type: actionType,
          params,
          rule_name: rule.name,
          rule_id: rule.id,
        },
        aiReasoning: buildAiReasoning(rule, actionType),
        actorType: 'ai',
        actorName: 'Rule Engine',
        ruleId: rule.id,
      });
      break;
    }
  }
}

/**
 * Build AI reasoning text for a draft based on rule conditions and action.
 */
function buildAiReasoning(rule: AutomationRule, actionType: string): string {
  const conditionDescriptions = rule.conditions.map((c) => {
    if (c.metric && c.operator) {
      return `${c.metric} ${c.operator} ${c.value}`;
    }
    const ct = (c as unknown as Record<string, unknown>).condition_type as string;
    if (ct) {
      return `${ct} ${c.value}`;
    }
    return JSON.stringify(c);
  });

  const logic = (rule.conditions[0] as unknown as Record<string, unknown>)?.logic === 'or' ? 'OR' : 'AND';

  return `Rule "${rule.name}" triggered because: ${conditionDescriptions.join(` ${logic} `)}. Action "${actionType}" was drafted for approval.`;
}

// ─── Job Trigger ───────────────────────────────────────────

/**
 * Add a job to the queue for immediate evaluation of a single workspace.
 */
export async function triggerRuleEvaluation(workspaceId: string): Promise<string> {
  const job = await ruleEvaluatorQueue.add(
    'evaluate-workspace',
    { workspaceId },
    {
      jobId: `workspace-${workspaceId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );
  logger.info({ workspaceId: workspaceId, id: job.id }, 'Queued evaluation for workspace %s, job %s', workspaceId, job.id);
  return job.id as string;
}

// ─── Scheduled Evaluation ──────────────────────────────────

/**
 * Query all active workspaces and queue evaluation jobs for each.
 * Called by a cron job every 15 minutes.
 */
export async function scheduleRuleEvaluations(): Promise<void> {
  logger.info('Starting scheduled evaluation for all workspaces');

  try {
    // Fetch all workspaces that have at least one active rule
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id')
      .order('id');

    if (error) {
      logger.error({ err: error }, 'Failed to fetch workspaces');
      return;
    }

    const workspaceIds = (workspaces ?? []).map((w) => w.id as string);
    logger.info({ length: workspaceIds.length }, 'Found %s workspaces to evaluate', workspaceIds.length);

    // Queue evaluation jobs for each workspace
    const batchSize = 10;
    for (let i = 0; i < workspaceIds.length; i += batchSize) {
      const batch = workspaceIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (workspaceId) => {
          try {
            // Only queue if the workspace has active rules
            const { data: hasRules, error: ruleCheckError } = await supabase
              .from('automation_rules')
              .select('id', { count: 'exact', head: true })
              .eq('workspace_id', workspaceId)
              .eq('status', 'active');

            if (ruleCheckError) {
              logger.error({ workspaceId, err: ruleCheckError }, 'Error checking rules for workspace %s: %s', workspaceId, ruleCheckError.message);
              return;
            }

            if ((hasRules?.length ?? 0) === 0) {
              return; // Skip workspaces with no active rules
            }

            await ruleEvaluatorQueue.add(
              'evaluate-workspace',
              { workspaceId },
              {
                jobId: `scheduled-${workspaceId}-${Date.now()}`,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              },
            );
            logger.info({ workspaceId: workspaceId }, 'Scheduled evaluation for workspace %s', workspaceId);
          } catch (err) {
            logger.error({ workspaceId, err }, 'Failed to schedule workspace %s', workspaceId);
          }
        }),
      );
    }

    logger.info({ length: workspaceIds.length }, 'Scheduled evaluation complete. Queued jobs for %s workspaces.', workspaceIds.length);
  } catch (err) {
    logger.error({ err }, 'Fatal error during scheduleRuleEvaluations');
  }
}

// ─── Graceful Shutdown ─────────────────────────────────────

/**
 * Close worker and queue connections gracefully.
 * Call this on application shutdown.
 */
export async function shutdownRuleEvaluator(): Promise<void> {
  logger.info('Shutting down...');

  try {
    await ruleEvaluatorWorker.close();
    logger.info('Worker closed');
  } catch (err) {
    logger.error({ err }, 'Error closing worker');
  }

  try {
    await ruleEvaluatorQueue.close();
    logger.info('Queue closed');
  } catch (err) {
    logger.error({ err }, 'Error closing queue');
  }

  try {
    await redisConnection.quit();
    logger.info('Redis connection closed');
  } catch (err) {
    logger.error({ err }, 'Error closing Redis connection');
  }

  logger.info('Shutdown complete');
}

// ─── Event Handlers ────────────────────────────────────────

ruleEvaluatorWorker.on('completed', (job) => {
  const summary = job.returnvalue as EvaluationSummary | undefined;
  logger.info({ jobId: job.id, workspaceId: job.data.workspaceId, summary }, 'Job completed for workspace');
});

ruleEvaluatorWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, workspaceId: job?.data?.workspaceId, err }, 'Job failed for workspace');
});

ruleEvaluatorWorker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});
