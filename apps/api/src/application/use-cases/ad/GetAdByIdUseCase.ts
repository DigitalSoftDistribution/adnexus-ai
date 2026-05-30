import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { Ad } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAdByIdInput {
  adId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAdByIdUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: GetAdByIdInput): Promise<Result<Ad>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const ad = await this.adRepo.findByIdAndWorkspace(input.adId, input.workspaceId);
    if (!ad) {
      return err(new NotFoundError('Ad'));
    }

    return ok(ad);
  }
}
