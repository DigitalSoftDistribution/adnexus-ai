import type { IAuditLogRepository, AuditLogSummary } from '../../../domain/repositories/IAuditLogRepository';
import { Result, ok } from '../../../domain/value-objects/Result';

interface GetAuditLogSummaryInput {
  workspaceId?: string;
}

export class GetAuditLogSummaryUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  async execute(input: GetAuditLogSummaryInput): Promise<Result<AuditLogSummary>> {
    const result = await this.auditLogRepository.getSummary(input.workspaceId);
    return ok(result);
  }
}
