import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import type { Asset } from '../../../domain/entities/Asset';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetAssetByIdInput {
  assetId: string;
  workspaceId: string;
}

export class GetAssetByIdUseCase {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: GetAssetByIdInput): Promise<Result<Asset>> {
    const asset = await this.assetRepository.findByIdAndWorkspace(input.assetId, input.workspaceId);

    if (!asset) {
      return err(new NotFoundError('Asset'));
    }

    return ok(asset);
  }
}
