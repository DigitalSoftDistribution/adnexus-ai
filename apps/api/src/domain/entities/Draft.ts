export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'rolled_back';
export type DraftType =
  | 'budget_adjustment'
  | 'bid_adjustment'
  | 'audience_change'
  | 'creative_swap'
  | 'schedule_change'
  | 'status_change'
  | 'campaign_creation'
  | 'campaign_deletion'
  | 'rule_execution'
  | 'ai_optimization'
  | 'manual_edit';

export type ActorType = 'ai' | 'user' | 'system';

export interface Draft {
  id: string;
  workspaceId: string;
  platform: Platform | 'all';
  campaignId: string | null;
  adsetId: string | null;
  adId: string | null;
  draftType: DraftType;
  changeSummary: string;
  changeDetail: Record<string, unknown>;
  aiReasoning: string | null;
  impactEstimate: string | null;
  actorType: ActorType;
  actorId: string | null;
  actorName: string | null;
  ruleId: string | null;
  status: DraftStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

import type { Platform } from './Campaign';
