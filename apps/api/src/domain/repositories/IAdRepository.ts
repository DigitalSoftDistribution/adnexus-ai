import type { Ad, AdPerformance, AdCreativePerformance } from '../entities/Ad';

export interface AdFilters {
  workspaceId: string;
  campaignId?: string;
  adsetId?: string;
  platform?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdListResult {
  ads: Ad[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdRepository {
  findById(id: string): Promise<Ad | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Ad | null>;
  list(filters: AdFilters): Promise<AdListResult>;
  getPerformance(adId: string, dateFrom: string, dateTo: string): Promise<AdPerformance>;
  getCreativePerformance(adId: string): Promise<AdCreativePerformance>;
}
