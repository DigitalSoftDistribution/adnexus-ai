import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { AdCreativePerformance } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAdCreativePerformanceInput {
  adId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAdCreativePerformanceUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: GetAdCreativePerformanceInput): Promise<Result<AdCreativePerformance>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const ad = await this.adRepo.findByIdAndWorkspace(input.adId, input.workspaceId);
    if (!ad) {
      return err(new NotFoundError('Ad'));
    }

    const performance = await this.adRepo.getCreativePerformance(input.adId);
    return ok(performance);
  }
}
