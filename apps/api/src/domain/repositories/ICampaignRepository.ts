import type { Campaign, CampaignStatus, Platform } from '../entities/Campaign';

export interface CampaignFilters {
  workspaceId: string;
  status?: CampaignStatus | CampaignStatus[];
  platform?: Platform | Platform[];
  search?: string;
  objective?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CampaignListResult {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CampaignSummary {
  totalCampaigns: number;
  activeCount: number;
  pausedCount: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
  platformBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface ICampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Campaign | null>;
  findByPlatformCampaignId(platformCampaignId: string): Promise<Campaign | null>;
  list(filters: CampaignFilters): Promise<CampaignListResult>;
  getSummary(workspaceId: string): Promise<CampaignSummary>;
  create(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign>;
  update(id: string, updates: Partial<Campaign>): Promise<Campaign | null>;
  delete(id: string): Promise<boolean>;
  countByWorkspace(workspaceId: string): Promise<number>;
  countByAdAccount(adAccountId: string): Promise<number>;
}
