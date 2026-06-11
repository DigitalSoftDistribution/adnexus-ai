import { supabase } from '../lib/supabase';
import { NotFoundError, ValidationError } from '../lib/errors';
import { createMetaCampaign, updateMetaCampaign } from './meta-api';
import { ragService } from './rag-service';
import { renderInsightCard, insightInputFromDraft } from './rag-cards';
import { getModuleLogger } from '../lib/logger';
import type { Draft, DraftStats, DraftType, Platform } from '../types';

const draftsLog = getModuleLogger('drafts-service');

/**
 * Record a resolved draft into the RAG optimization-memory collection.
 * Best-effort: never blocks or fails the draft resolution flow.
 */
async function recordDraftOutcome(draft: Draft): Promise<void> {
  try {
    if (!(await ragService.isReady())) return;
    await ragService.indexCard(
      renderInsightCard(draft.workspace_id, insightInputFromDraft(draft)),
    );
  } catch (err) {
    draftsLog.warn({ draftId: draft.id, msg: (err as Error).message }, 'rag insight log skipped');
  }
}

// ─── Create Draft ────────────────────────────────────────────

export interface CreateDraftInput {
  workspaceId: string;
  platform: Platform | 'all';
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  draftType: DraftType;
  changeSummary: string;
  changeDetail: Record<string, unknown>;
  aiReasoning?: string;
  impactEstimate?: string;
  actorType: 'ai' | 'user' | 'system';
  actorId?: string;
  actorName?: string;
  ruleId?: string;
}

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      workspace_id: input.workspaceId,
      platform: input.platform,
      campaign_id: input.campaignId,
      adset_id: input.adsetId,
      ad_id: input.adId,
      draft_type: input.draftType,
      change_summary: input.changeSummary,
      change_detail: input.changeDetail,
      ai_reasoning: input.aiReasoning,
      impact_estimate: input.impactEstimate,
      actor_type: input.actorType,
      actor_id: input.actorId,
      actor_name: input.actorName,
      rule_id: input.ruleId,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create draft: ${error?.message}`);

  // Log to audit
  await supabase.from('audit_log').insert({
    workspace_id: input.workspaceId,
    actor_type: input.actorType,
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: `Draft created: ${input.changeSummary}`,
    action_category: 'draft_created',
    campaign_id: input.campaignId,
    details: { draft_type: input.draftType, change_detail: input.changeDetail },
    source: input.actorType === 'ai' ? 'ai_agent' : 'dashboard',
  });

  return data as Draft;
}

// ─── List Drafts ─────────────────────────────────────────────

export async function listDrafts(
  workspaceId: string,
  filters?: { status?: string; platform?: string; page?: number; limit?: number },
): Promise<{ drafts: Draft[]; total: number }> {
  let query = supabase
    .from('drafts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.platform) query = query.eq('platform', filters.platform);

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  query = query.range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list drafts: ${error.message}`);

  return { drafts: (data ?? []) as Draft[], total: count ?? 0 };
}

// ─── Get Draft ───────────────────────────────────────────────

export async function getDraft(draftId: string): Promise<Draft> {
  const { data, error } = await supabase.from('drafts').select('*').eq('id', draftId).single();
  if (error || !data) throw new NotFoundError('Draft');
  return data as Draft;
}

// ─── Approve Draft ───────────────────────────────────────────

export async function approveDraft(draftId: string, approverId: string): Promise<Draft> {
  const draft = await getDraft(draftId);
  if (draft.status !== 'pending') throw new ValidationError(`Draft is ${draft.status}, not pending`);

  // Apply the change to the live ad account
  try {
    await applyDraftChange(draft);
  } catch (err) {
    // Mark as error but don't throw — draft stays in error state
    await supabase
      .from('drafts')
      .update({
        status: 'error',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        approver_id: approverId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', draftId);
    throw err;
  }

  // Mark as approved
  const { data, error } = await supabase
    .from('drafts')
    .update({
      status: 'approved',
      approver_id: approverId,
      executed_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to approve draft: ${error?.message}`);

  // Log to audit
  await supabase.from('audit_log').insert({
    workspace_id: draft.workspace_id,
    actor_type: 'user',
    actor_id: approverId,
    action: `Draft approved: ${draft.change_summary}`,
    action_category: 'draft_approved',
    campaign_id: draft.campaign_id,
    details: { draft_id: draftId, change_detail: draft.change_detail },
    source: 'dashboard',
  });

  // Record outcome into RAG optimization memory (best-effort).
  await recordDraftOutcome(data as Draft);

  return data as Draft;
}

// ─── Reject Draft ────────────────────────────────────────────

export async function rejectDraft(draftId: string, userId: string, reason?: string): Promise<Draft> {
  const draft = await getDraft(draftId);
  if (draft.status !== 'pending') throw new ValidationError(`Draft is ${draft.status}`);

  const { data, error } = await supabase
    .from('drafts')
    .update({
      status: 'rejected',
      approver_id: userId,
      approval_note: reason,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to reject draft: ${error?.message}`);

  await supabase.from('audit_log').insert({
    workspace_id: draft.workspace_id,
    actor_type: 'user',
    actor_id: userId,
    action: `Draft rejected: ${draft.change_summary}`,
    action_category: 'draft_rejected',
    campaign_id: draft.campaign_id,
    details: { draft_id: draftId, reason },
    source: 'dashboard',
  });

  // Record outcome into RAG optimization memory (best-effort).
  await recordDraftOutcome(data as Draft);

  return data as Draft;
}

// ─── Schedule Draft ──────────────────────────────────────────

export async function scheduleDraft(draftId: string, executeAt: string): Promise<Draft> {
  const draft = await getDraft(draftId);
  if (draft.status !== 'pending') throw new ValidationError(`Draft is ${draft.status}`);

  const { data, error } = await supabase
    .from('drafts')
    .update({ status: 'scheduled', scheduled_at: executeAt })
    .eq('id', draftId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to schedule draft: ${error?.message}`);
  return data as Draft;
}

// ─── Stats ───────────────────────────────────────────────────

export async function getDraftStats(workspaceId: string): Promise<DraftStats> {
  const today = new Date().toISOString().slice(0, 10);

  const [pending, approved, rejected, autoApplied] = await Promise.all([
    supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending'),
    supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'approved').gte('resolved_at', today),
    supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'rejected').gte('resolved_at', today),
    supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'auto_applied').gte('resolved_at', today),
  ]);

  return {
    pending: pending.count ?? 0,
    approved_today: approved.count ?? 0,
    rejected_today: rejected.count ?? 0,
    auto_applied_today: autoApplied.count ?? 0,
  };
}

import { decryptOAuthTokenFromStorage } from '../security/oauth-token-crypto';

// ─── Apply Draft Change (internal) ───────────────────────────

async function applyDraftChange(draft: Draft): Promise<void> {
  // Get ad account token
  const { data: account } = await supabase
    .from('ad_accounts')
    .select('oauth_token, platform')
    .eq('workspace_id', draft.workspace_id)
    .eq('platform', draft.platform === 'all' ? 'meta' : draft.platform)
    .limit(1)
    .single();

  const oauthToken = decryptOAuthTokenFromStorage(account?.oauth_token);
  if (!oauthToken) {
    throw new Error(`No connected ${draft.platform} account found`);
  }

  const detail = draft.change_detail;

  switch (draft.draft_type) {
    case 'campaign_create': {
      // detail has: name, objective, daily_budget
      await createMetaCampaign(
        '', // account ID would come from ad_accounts
        oauthToken,
        {
          name: detail.name as string,
          objective: detail.objective as string,
          status: 'PAUSED',
          daily_budget: detail.daily_budget as number,
        },
      );
      break;
    }
    case 'budget_change': {
      const campaignPid = detail.platform_campaign_id as string;
      if (campaignPid) {
        await updateMetaCampaign(campaignPid, oauthToken, {
          [detail.field === 'lifetime_budget' ? 'lifetime_budget' : 'daily_budget']:
            Math.round((detail.new_value as number) * 100),
        });
      }
      break;
    }
    case 'status_change': {
      const campaignPid = detail.platform_campaign_id as string;
      if (campaignPid) {
        await updateMetaCampaign(campaignPid, oauthToken, {
          status: detail.new_status as string,
        });
      }
      break;
    }
    default:
      throw new Error(`Draft type ${draft.draft_type} not yet implemented for live application`);
  }
}
