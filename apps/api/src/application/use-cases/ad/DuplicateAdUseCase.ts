import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { Ad } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DuplicateAdInput {
  adId: string;
  workspaceId: string;
  userRole: string;
}

export class DuplicateAdUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: DuplicateAdInput): Promise<Result<Ad>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to duplicate ads'));
    }

    const existing = await this.adRepo.findByIdAndWorkspace(input.adId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Ad'));
    }

    return ok({ ...existing, name: `${existing.name} (Copy)`, status: 'draft' });
  }
}
