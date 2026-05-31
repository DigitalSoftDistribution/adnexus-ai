import type { CampaignHistoryEntry, CampaignHistoryAction } from '../entities/CampaignHistory';

export interface CampaignHistoryFilters {
  campaignId: string;
  action?: CampaignHistoryAction | CampaignHistoryAction[];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CampaignHistoryListResult {
  entries: CampaignHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ICampaignHistoryRepository {
  list(filters: CampaignHistoryFilters): Promise<CampaignHistoryListResult>;
  create(entry: Omit<CampaignHistoryEntry, 'id' | 'createdAt'>): Promise<CampaignHistoryEntry>;
}
