import type { AuditLog } from '../entities/AuditLog';

export interface AuditLogFilters {
  workspaceId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  actionCategory?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAuditLogRepository {
  create(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findByWorkspace(workspaceId: string, filters?: Omit<AuditLogFilters, 'workspaceId'>): Promise<AuditLogListResult>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByUser(userId: string, filters?: Omit<AuditLogFilters, 'userId'>): Promise<AuditLogListResult>;
  list(filters: AuditLogFilters): Promise<AuditLogListResult>;
}
