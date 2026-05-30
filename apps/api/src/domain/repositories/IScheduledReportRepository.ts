import type { ScheduledReport, ScheduledReportStatus, ScheduledReportType } from '../entities/ScheduledReport';

export interface ScheduledReportFilters {
  workspaceId: string;
  status?: ScheduledReportStatus | ScheduledReportStatus[];
  reportType?: ScheduledReportType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ScheduledReportListResult {
  reports: ScheduledReport[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IScheduledReportRepository {
  findById(id: string): Promise<ScheduledReport | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<ScheduledReport | null>;
  findDue(): Promise<ScheduledReport[]>;
  list(filters: ScheduledReportFilters): Promise<ScheduledReportListResult>;
  create(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport>;
  update(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null>;
  delete(id: string): Promise<boolean>;
  updateRunStatus(id: string, status: string, nextRunAt: Date | null): Promise<void>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
