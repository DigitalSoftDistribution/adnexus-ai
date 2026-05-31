export type AdSetStatus = 'active' | 'paused' | 'archived' | 'deleted';
export type BidStrategy = 'lowest_cost' | 'cost_cap' | 'bid_cap' | 'target_cost' | 'highest_value';

export interface AdSet {
  id: string;
  campaignId: string;
  platformAdSetId: string | null;
  name: string;
  status: AdSetStatus;
  budget: number | null;
  budgetType: 'daily' | 'lifetime' | null;
  bidStrategy: BidStrategy | null;
  bidAmount: number | null;
  targeting: Record<string, unknown> | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdSetFilters {
  campaignId: string;
  status?: AdSetStatus | AdSetStatus[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdSetListResult {
  adSets: AdSet[];
  total: number;
  page: number;
  totalPages: number;
}
