import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import type { AssetListResult } from '../../../domain/entities/Asset';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListAssetsInput {
  workspaceId: string;
  type?: string | string[];
  status?: string | string[];
  campaignId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAssetsUseCase {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: ListAssetsInput): Promise<Result<AssetListResult>> {
    const result = await this.assetRepository.list({
      workspaceId: input.workspaceId,
      type: input.type as any,
      status: input.status as any,
      campaignId: input.campaignId,
      search: input.search,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
