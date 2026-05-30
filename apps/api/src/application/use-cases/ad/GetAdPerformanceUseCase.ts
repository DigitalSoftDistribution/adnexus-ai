import type { IAdRepository } from '../../../domain/repositories/IAdRepository';
import type { AdPerformance } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAdPerformanceInput {
  adId: string;
  workspaceId: string;
  userRole: string;
  dateFrom?: string;
  dateTo?: string;
}

export class GetAdPerformanceUseCase {
  constructor(private adRepo: IAdRepository) {}

  async execute(input: GetAdPerformanceInput): Promise<Result<AdPerformance>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const ad = await this.adRepo.findByIdAndWorkspace(input.adId, input.workspaceId);
    if (!ad) {
      return err(new NotFoundError('Ad'));
    }

    const defaultDateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const defaultDateTo = new Date().toISOString().slice(0, 10);

    const performance = await this.adRepo.getPerformance(
      input.adId,
      input.dateFrom || defaultDateFrom,
      input.dateTo || defaultDateTo,
    );

    return ok(performance);
  }
}
