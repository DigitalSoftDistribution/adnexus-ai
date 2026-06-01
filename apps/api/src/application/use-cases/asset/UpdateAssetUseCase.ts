import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import type { Asset } from '../../../domain/entities/Asset';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface UpdateAssetInput {
  assetId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Asset>;
}

export class UpdateAssetUseCase {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: UpdateAssetInput): Promise<Result<Asset>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.assetRepository.findByIdAndWorkspace(input.assetId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Asset'));
    }

    const asset = await this.assetRepository.update(input.assetId, input.updates);

    if (!asset) {
      return err(new NotFoundError('Asset'));
    }

    return ok(asset);
  }
}
