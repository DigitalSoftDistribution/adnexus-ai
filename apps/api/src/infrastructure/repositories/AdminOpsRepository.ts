import type {
  IAdminOpsRepository,
  AdminErrorListResult,
  AdminErrorFilters,
  ApiUsageSummary,
  ApiUsageFilters,
  FeatureFlag,
} from '../../domain/repositories/IAdminOpsRepository';

/** Stub implementation — real data sourced from Sentry / Prometheus / feature-flag backend. */
export class AdminOpsRepository implements IAdminOpsRepository {
  async getErrors(filters: AdminErrorFilters): Promise<AdminErrorListResult> {
    return { errors: [], total: 0, page: filters.page, totalPages: 0 };
  }

  async getApiUsage(_filters: ApiUsageFilters): Promise<ApiUsageSummary> {
    return {
      totalRequests: 0,
      byEndpoint: [],
      period: {
        from: _filters.dateFrom ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: _filters.dateTo ?? new Date().toISOString(),
      },
    };
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return [];
  }

  async updateFeatureFlag(key: string, value: boolean): Promise<FeatureFlag> {
    return { key, value, description: '', updatedAt: new Date().toISOString() };
  }
}
