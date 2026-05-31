import type { IAssetRepository } from '../../../domain/repositories/IAssetRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteAssetInput {
  assetId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteAssetUseCase {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: DeleteAssetInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.assetRepository.findByIdAndWorkspace(input.assetId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Asset'));
    }

    const deleted = await this.assetRepository.delete(input.assetId);
    return ok(deleted);
  }
}
