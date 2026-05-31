import type { AuditLogEntry } from '../entities/AuditLogEntry';

export interface AuditLogFilters {
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

export interface AuditLogListResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditLogSummary {
  totalEntries: number;
  entriesToday: number;
  entriesThisWeek: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string | null; count: number }>;
}

export interface IAuditLogRepository {
  list(filters: AuditLogFilters): Promise<AuditLogListResult>;
  getSummary(workspaceId?: string): Promise<AuditLogSummary>;
  findById(id: string): Promise<AuditLogEntry | null>;
}
