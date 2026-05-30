import type { IAdRepository, AdListResult } from '../../../domain/repositories/IAdRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListAdsInput {
  workspaceId: string;
  userRole: string;
  campaignId?: string;
  adsetId?: string;
  platform?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAdsUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: ListAdsInput): Promise<Result<AdListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.adRepo.list({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      adsetId: input.adsetId,
      platform: input.platform,
      status: input.status,
      search: input.search,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
