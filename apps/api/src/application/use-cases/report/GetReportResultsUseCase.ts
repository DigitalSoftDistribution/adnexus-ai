import type { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetReportResultsInput {
  reportId: string;
  workspaceId: string;
  userRole: string;
}

export class GetReportResultsUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: GetReportResultsInput): Promise<Result<Record<string, unknown>>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.reportRepo.findByIdAndWorkspace(input.reportId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Report'));
    }

    const results = await this.reportRepo.runReport(input.reportId);
    return ok(results);
  }
}
