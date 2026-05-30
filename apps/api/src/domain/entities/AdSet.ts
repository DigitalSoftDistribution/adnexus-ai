export type AdSetStatus = 'active' | 'paused' | 'archived' | 'deleted';

export interface AdSet {
  id: string;
  workspaceId: string;
  campaignId: string;
  platform: string;
  platformAdsetId: string | null;
  name: string;
  status: AdSetStatus;
  dailyBudget: number | null;
  bidStrategy: string | null;
  bidAmount: number | null;
  targeting: Record<string, unknown>;
  platformData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
