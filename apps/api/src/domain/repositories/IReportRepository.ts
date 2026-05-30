export interface Report {
  id: string;
  workspaceId: string;
  name: string;
  type: 'performance' | 'attribution' | 'creative' | 'custom';
  config: Record<string, unknown>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  } | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilters {
  workspaceId: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface ReportListResult {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface IReportRepository {
  list(filters: ReportFilters): Promise<ReportListResult>;
  findById(id: string): Promise<Report | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Report | null>;
  create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report>;
  update(id: string, updates: Partial<Report>): Promise<Report | null>;
  delete(id: string): Promise<boolean>;
  runReport(reportId: string): Promise<Record<string, unknown>>;
}
