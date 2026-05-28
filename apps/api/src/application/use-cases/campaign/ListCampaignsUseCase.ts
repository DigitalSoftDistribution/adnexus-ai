import type { ICampaignRepository, CampaignFilters, CampaignListResult } from '../../../domain/repositories/ICampaignRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

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

export class ListCampaignsUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: ListCampaignsInput): Promise<Result<CampaignListResult>> {
    // All authenticated roles can list campaigns
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
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
    return ok(result);
  }
}
