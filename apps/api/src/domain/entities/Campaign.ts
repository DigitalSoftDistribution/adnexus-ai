export type CampaignStatus = 'active' | 'paused' | 'archived' | 'draft' | 'pending' | 'deleted';
export type Platform = 'meta' | 'google' | 'tiktok' | 'snap';
export type BudgetType = 'daily' | 'lifetime';
export type CampaignObjective =
  | 'awareness'
  | 'traffic'
  | 'engagement'
  | 'leads'
  | 'sales'
  | 'app_promotion'
  | 'reach'
  | 'video_views';

export interface Campaign {
  id: string;
  workspaceId: string;
  adAccountId: string;
  platform: Platform;
  platformCampaignId: string | null;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective | null;
  budget: string | null;
  budgetType: BudgetType | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  cpm: number | null;
  cpc: number | null;
  startDate: string | null;
  endDate: string | null;
  platformData: Record<string, unknown> | null;
  leadFormId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  cpm: number;
  cpc: number;
}
