import type { IReportRepository, ReportListResult } from '../../../domain/repositories/IReportRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListReportsInput {
  workspaceId: string;
  userRole: string;
  type?: string;
  page?: number;
  limit?: number;
}

export class ListReportsUseCase {
  constructor(private reportRepo: IReportRepository) {}

  async execute(input: ListReportsInput): Promise<Result<ReportListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.reportRepo.list({
      workspaceId: input.workspaceId,
      type: input.type,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
