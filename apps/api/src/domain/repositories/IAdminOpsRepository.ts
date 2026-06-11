export interface AdminError {
  id: string;
  message: string;
  stack: string | null;
  severity: 'error' | 'warning';
  ctx: string | null;
  timestamp: Date;
}

export interface AdminErrorListResult {
  errors: AdminError[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminErrorFilters {
  page: number;
  limit: number;
  severity?: string;
}

export interface ApiUsageFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiUsageEntry {
  endpoint: string;
  method: string;
  count: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface ApiUsageSummary {
  totalRequests: number;
  byEndpoint: ApiUsageEntry[];
  period: { from: string; to: string };
}

export interface FeatureFlag {
  key: string;
  value: boolean;
  description: string;
  updatedAt: string;
}

export interface IAdminOpsRepository {
  getErrors(filters: AdminErrorFilters): Promise<AdminErrorListResult>;
  getApiUsage(filters: ApiUsageFilters): Promise<ApiUsageSummary>;
  getFeatureFlags(): Promise<FeatureFlag[]>;
  updateFeatureFlag(key: string, value: boolean): Promise<FeatureFlag>;
}
