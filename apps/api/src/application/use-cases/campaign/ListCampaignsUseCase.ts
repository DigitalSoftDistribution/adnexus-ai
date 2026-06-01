import type { ICampaignRepository, CampaignFilters, CampaignListResult } from '../../../domain/repositories/ICampaignRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';
import * as cache from '../../../services/cache-service';

export interface ListCampaignsInput {
  workspaceId: string;
  userRole: string;
  status?: string | string[];
  platform?: string | string[];
  search?: string;
  objective?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

function getCacheKey(input: ListCampaignsInput): string {
  const { workspaceId, status, platform, search, objective, sortBy, sortOrder, page, limit } = input;
  const parts = [workspaceId, status, platform, search, objective, sortBy, sortOrder, page, limit];
  return `campaigns:list:${parts.map((p) => p ?? '_').join(':')}`;
}

export class ListCampaignsUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: ListCampaignsInput): Promise<Result<CampaignListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const cacheKey = getCacheKey(input);
    const cached = await cache.get<CampaignListResult>(cacheKey);
    if (cached) {
      return ok(cached);
    }

    const filters: CampaignFilters = {
      workspaceId: input.workspaceId,
      status: input.status as any,
      platform: input.platform as any,
      search: input.search,
      objective: input.objective,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      page: input.page,
      limit: input.limit,
    };

    const result = await this.campaignRepo.list(filters);
    await cache.set(cacheKey, result, 300); // 5 min cache
    return ok(result);
  }
}
