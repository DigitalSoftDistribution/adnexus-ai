import type { AdSet, AdSetStatus } from '../entities/AdSet';

export interface AdSetFilters {
  workspaceId: string;
  campaignId?: string;
  status?: AdSetStatus | AdSetStatus[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdSetListResult {
  adSets: AdSet[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdSetRepository {
  findById(id: string): Promise<AdSet | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<AdSet | null>;
  findByCampaign(campaignId: string): Promise<AdSet[]>;
  list(filters: AdSetFilters): Promise<AdSetListResult>;
  create(adSet: Omit<AdSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdSet>;
  update(id: string, updates: Partial<AdSet>): Promise<AdSet | null>;
  delete(id: string): Promise<boolean>;
  countByCampaign(campaignId: string): Promise<number>;
}
