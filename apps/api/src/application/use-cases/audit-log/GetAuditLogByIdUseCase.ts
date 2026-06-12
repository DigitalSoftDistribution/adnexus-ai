import type { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import type { AuditLogEntry } from '../../../domain/entities/AuditLogEntry';
import { Result, ok, err, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAuditLogByIdInput {
  entryId: string;
  workspaceId: string;
}

export class GetAuditLogByIdUseCase {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  async execute(input: GetAuditLogByIdInput): Promise<Result<AuditLogEntry>> {
    const entry = await this.auditLogRepo.findById(input.entryId);
    if (!entry || entry.workspaceId !== input.workspaceId) {
      return err(new NotFoundError('Audit log entry'));
    }
    return ok(entry);
  }
}
