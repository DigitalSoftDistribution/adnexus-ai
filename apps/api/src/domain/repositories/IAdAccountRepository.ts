import type { AdAccount, AdAccountPlatform, AdAccountStatus } from '../entities/AdAccount';

export interface AdAccountFilters {
  workspaceId: string;
  platform?: AdAccountPlatform | AdAccountPlatform[];
  status?: AdAccountStatus | AdAccountStatus[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdAccountListResult {
  adAccounts: AdAccount[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdAccountRepository {
  findById(id: string): Promise<AdAccount | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<AdAccount | null>;
  findByPlatformAccountId(platformAccountId: string, platform: string): Promise<AdAccount | null>;
  findByWorkspace(workspaceId: string): Promise<AdAccount[]>;
  list(filters: AdAccountFilters): Promise<AdAccountListResult>;
  create(adAccount: Omit<AdAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdAccount>;
  update(id: string, updates: Partial<AdAccount>): Promise<AdAccount | null>;
  delete(id: string): Promise<boolean>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
