export type ScheduledReportType = 'performance' | 'funnel' | 'attribution' | 'creative' | 'custom';
export type ScheduledReportFormat = 'pdf' | 'csv' | 'xlsx' | 'html';
export type ScheduledReportStatus = 'active' | 'paused' | 'error';

export interface ScheduledReport {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  reportType: ScheduledReportType;
  config: Record<string, unknown>;
  scheduleCron: string;
  recipients: string[];
  format: ScheduledReportFormat;
  status: ScheduledReportStatus;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  nextRunAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
