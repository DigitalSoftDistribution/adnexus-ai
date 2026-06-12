import { query } from '../db/connection';
import { ForbiddenError } from '../lib/errors';
import { PLAN_LIMITS, type PlanTier } from '../domain/entities/Workspace';
import { PLAN_LIMITS as BILLING_PLAN_LIMITS } from './stripe';

function currentBillingMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Reject campaign / campaign_create draft creation when the workspace is at
 * its plan quota (includes pending campaign_create drafts).
 */
export async function assertCampaignQuota(workspaceId: string): Promise<void> {
  const { rows: planRows } = await query<{ plan: PlanTier | null }>(
    'SELECT plan FROM workspaces WHERE id = $1',
    [workspaceId],
  );
  const limits = PLAN_LIMITS[planRows[0]?.plan ?? 'free'] ?? PLAN_LIMITS.free;

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT (
       (SELECT COUNT(*) FROM campaigns c
          LEFT JOIN ad_accounts a ON a.id = c.ad_account_id
         WHERE c.workspace_id = $1 OR a.workspace_id = $1)
       + (SELECT COUNT(*) FROM drafts
            WHERE workspace_id = $1
              AND draft_type = 'campaign_create'
              AND status = 'pending')
     )::text AS count`,
    [workspaceId],
  );

  const current = parseInt(countRows[0]?.count ?? '0', 10);
  if (current >= limits.maxCampaigns) {
    throw new ForbiddenError(
      `Campaign limit reached for your plan (${limits.maxCampaigns}), including pending campaign drafts. Upgrade your plan to create more campaigns.`,
    );
  }
}

/**
 * Reject creative_upload draft creation when monthly creative quota is exhausted.
 * Counts live ads plus pending creative_upload drafts against ai_credits totals.
 */
export async function assertCreativeQuota(workspaceId: string): Promise<void> {
  const { rows: planRows } = await query<{ plan: PlanTier | null }>(
    'SELECT plan FROM workspaces WHERE id = $1',
    [workspaceId],
  );
  const plan = planRows[0]?.plan ?? 'free';
  const billingLimits = BILLING_PLAN_LIMITS[plan] ?? BILLING_PLAN_LIMITS.free;
  if (billingLimits.creatives < 0) return;

  const month = currentBillingMonth();

  const { rows: creditRows } = await query<{
    creatives_used: number | null;
    creatives_total: number | null;
  }>(
    `SELECT creatives_used, creatives_total
       FROM ai_credits
      WHERE workspace_id = $1 AND month = $2
      LIMIT 1`,
    [workspaceId, month],
  );

  const creativesTotal = creditRows[0]?.creatives_total ?? billingLimits.creatives;
  const creativesUsed = creditRows[0]?.creatives_used ?? 0;

  const { rows: pendingRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM drafts
      WHERE workspace_id = $1
        AND draft_type = 'creative_upload'
        AND status = 'pending'`,
    [workspaceId],
  );
  const pendingCreatives = parseInt(pendingRows[0]?.count ?? '0', 10);

  if (creativesUsed + pendingCreatives >= creativesTotal) {
    throw new ForbiddenError(
      `Creative limit reached for your plan (${creativesTotal} per month, including pending uploads). Upgrade your plan to create more creatives.`,
    );
  }
}
