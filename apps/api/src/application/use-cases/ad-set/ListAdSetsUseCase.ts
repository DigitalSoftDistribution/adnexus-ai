import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import type { AdSetListResult } from '../../../domain/entities/AdSet';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListAdSetsInput {
  campaignId: string;
  status?: string | string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class ListAdSetsUseCase {
  constructor(private readonly adSetRepository: IAdSetRepository) {}

  async execute(input: ListAdSetsInput): Promise<Result<AdSetListResult>> {
    const result = await this.adSetRepository.list({
      campaignId: input.campaignId,
      status: input.status as any,
      search: input.search,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
