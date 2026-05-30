import type { IReportRepository } from '../../../domain/repositories/IReportRepository';
import type { Report } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface UpdateReportInput {
  reportId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Report>;
}

export class UpdateReportUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: UpdateReportInput): Promise<Result<Report>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.reportRepo.findByIdAndWorkspace(input.reportId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Report'));
    }

    const report = await this.reportRepo.update(input.reportId, input.updates);
    if (!report) {
      return err(new NotFoundError('Report'));
    }

    return ok(report);
  }
}
