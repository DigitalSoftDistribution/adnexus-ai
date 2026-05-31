import type { AdSet, AdSetFilters, AdSetListResult } from '../entities/AdSet';

export interface IAdSetRepository {
  findById(id: string): Promise<AdSet | null>;
  findByIdAndCampaign(id: string, campaignId: string): Promise<AdSet | null>;
  list(filters: AdSetFilters): Promise<AdSetListResult>;
  create(adSet: Omit<AdSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdSet>;
  update(id: string, updates: Partial<AdSet>): Promise<AdSet | null>;
  delete(id: string): Promise<boolean>;
  countByCampaign(campaignId: string): Promise<number>;
}
