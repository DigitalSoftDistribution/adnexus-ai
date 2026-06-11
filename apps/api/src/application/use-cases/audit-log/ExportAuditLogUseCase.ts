import type { IAuditLogRepository, AuditLogListResult } from '../../../domain/repositories/IAuditLogRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ExportAuditLogInput {
  workspaceId: string;
  userRole: string;
  format: 'csv' | 'json';
  dateFrom?: string;
  dateTo?: string;
  actionCategory?: string;
  entityType?: string;
}

export interface AuditLogExportResult {
  data: string;
  filename: string;
  format: 'csv' | 'json';
  totalEntries: number;
}

export class ExportAuditLogUseCase {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  async execute(input: ExportAuditLogInput): Promise<Result<AuditLogExportResult>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only admins can export audit logs'));
    }

    // Fetch all entries (paginated query with high limit for export)
    const result = await this.auditLogRepo.list({
      workspaceId: input.workspaceId,
      actionCategory: input.actionCategory,
      entityType: input.entityType,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: 1,
      limit: 10_000,
    });

    const entries = result.entries;
    const filename = `audit-log-${new Date().toISOString().split('T')[0]}`;

    if (input.format === 'csv') {
      const headers = ['id', 'timestamp', 'userId', 'userName', 'actionCategory', 'entityType', 'entityId', 'details', 'workspaceId'];
      const rows = entries.map((e) =>
        [
          e.id,
          e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
          e.userId ?? '',
          e.actorName ?? '',
          e.actionCategory ?? '',
          e.entityType ?? '',
          e.entityId ?? '',
          JSON.stringify(e.details ?? e.metadata ?? {}),
          e.workspaceId ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
      const csv = [headers.join(','), ...rows].join('\n');
      return ok({ data: csv, filename: `${filename}.csv`, format: 'csv', totalEntries: entries.length });
    }

    return ok({ data: JSON.stringify(entries, null, 2), filename: `${filename}.json`, format: 'json', totalEntries: entries.length });
  }
}
