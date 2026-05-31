import type { IAuditLogRepository, AuditLogListResult } from '../../../domain/repositories/IAuditLogRepository';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListAuditLogInput {
  workspaceId?: string;
  userId?: string;
  actionCategory?: string | string[];
  entityType?: string;
  entityId?: string;
  campaignId?: string;
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export class ListAuditLogUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  async execute(input: ListAuditLogInput): Promise<Result<AuditLogListResult>> {
    const result = await this.auditLogRepository.list({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actionCategory: input.actionCategory,
      entityType: input.entityType,
      entityId: input.entityId,
      campaignId: input.campaignId,
      platform: input.platform,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
