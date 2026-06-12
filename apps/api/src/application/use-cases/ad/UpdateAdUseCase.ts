import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { Ad } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface UpdateAdInput {
  adId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Ad>;
}

export class UpdateAdUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: UpdateAdInput): Promise<Result<Ad>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to update ads'));
    }

    const existing = await this.adRepo.findByIdAndWorkspace(input.adId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Ad'));
    }

    const updated = await this.adRepo.update(input.adId, input.updates);
    if (!updated) {
      return err(new NotFoundError('Ad'));
    }

    return ok(updated);
  }
}
