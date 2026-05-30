import type { IReportRepository } from '../../../domain/repositories/IReportRepository';
import type { Report } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetReportByIdInput {
  reportId: string;
  workspaceId: string;
  userRole: string;
}

export class GetReportByIdUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: GetReportByIdInput): Promise<Result<Report>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const report = await this.reportRepo.findByIdAndWorkspace(input.reportId, input.workspaceId);
    if (!report) {
      return err(new NotFoundError('Report'));
    }

    return ok(report);
  }
}
