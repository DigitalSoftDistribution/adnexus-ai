export type ExportFormat = 'csv' | 'pdf' | 'xlsx' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportEntity = 'campaigns' | 'ads' | 'audiences' | 'reports' | 'audit_log' | 'billing';

export interface Export {
  id: string;
  workspaceId: string;
  name: string;
  entity: ExportEntity;
  format: ExportFormat;
  status: ExportStatus;
  filters: Record<string, unknown> | null;
  fileUrl: string | null;
  fileSize: number | null;
  rowCount: number | null;
  errorMessage: string | null;
  createdBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportFilters {
  workspaceId: string;
  status?: ExportStatus | ExportStatus[];
  entity?: ExportEntity | ExportEntity[];
  format?: ExportFormat | ExportFormat[];
  page?: number;
  limit?: number;
}

export interface ExportListResult {
  exports: Export[];
  total: number;
  page: number;
  totalPages: number;
}
