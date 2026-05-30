import type { ApiKey, ApiKeyStatus } from '../entities/ApiKey';

export interface ApiKeyFilters {
  workspaceId: string;
  status?: ApiKeyStatus | ApiKeyStatus[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApiKeyListResult {
  apiKeys: ApiKey[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IApiKeyRepository {
  findByHash(keyHash: string): Promise<ApiKey | null>;
  findById(id: string): Promise<ApiKey | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<ApiKey | null>;
  list(filters: ApiKeyFilters): Promise<ApiKeyListResult>;
  create(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiKey>;
  updateStatus(id: string, status: ApiKeyStatus, revokedBy?: string): Promise<ApiKey | null>;
  updateUsage(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
