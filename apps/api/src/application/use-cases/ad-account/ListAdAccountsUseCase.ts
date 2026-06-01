import type { IAdAccountRepository, AdAccountFilters } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccountPlatform } from '../../../domain/entities/AdAccount';
import type { AdAccountListResult } from '../../../domain/repositories/IAdAccountRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListAdAccountsInput {
  workspaceId: string;
  userRole: string;
  platform?: AdAccountPlatform | AdAccountPlatform[];
  status?: string | string[];
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAdAccountsUseCase {
  constructor(private adAccountRepo: IAdAccountRepository) {}

  async execute(input: ListAdAccountsInput): Promise<Result<AdAccountListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to view ad accounts'));
    }

    const filters: AdAccountFilters = {
      workspaceId: input.workspaceId,
      platform: input.platform as AdAccountPlatform | AdAccountPlatform[] | undefined,
      status: input.status as any,
      search: input.search,
      page: input.page,
      limit: input.limit,
    };

    const result = await this.adAccountRepo.list(filters);
    return ok(result);
  }
}
