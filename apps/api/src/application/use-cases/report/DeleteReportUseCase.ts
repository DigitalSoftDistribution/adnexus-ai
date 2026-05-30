import type { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DeleteReportInput {
  reportId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteReportUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: DeleteReportInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.reportRepo.findByIdAndWorkspace(input.reportId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Report'));
    }

    const success = await this.reportRepo.delete(input.reportId);
    return ok(success);
  }
}
