// ============================================================================
// Report Generation Types
// ============================================================================

/** Supported report formats for export */
export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

/** Job types processed by the ReportGenerationWorker */
export type ReportJobType = 'scheduled' | 'on-demand' | 'export';

/** Time range for report data aggregation */
export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

/** Platform data source configuration */
export interface PlatformSource {
  platformId: string;
  platformName: string;
  credentials: PlatformCredentials;
  metrics: string[];
}

/** Platform authentication credentials */
export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
}

/** Chart configuration for report visualization */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'stacked-bar';
  title: string;
  data: ChartData;
  options?: ChartOptions;
  width?: number;
  height?: number;
}

/** Chart data structure */
export interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

/** Chart dataset */
export interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

/** Chart rendering options */
export interface ChartOptions {
  responsive?: boolean;
  plugins?: {
    legend?: { display?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
    title?: { display?: boolean; text?: string };
  };
  scales?: Record<string, unknown>;
}

/** Report generation parameters */
export interface ReportParams {
  name: string;
  description?: string;
  timeRange: TimeRange;
  platforms: PlatformSource[];
  charts: ChartConfig[];
  emailRecipients?: string[];
  scheduledScheduleId?: string;
  /** Owning workspace — required to persist results to report_results */
  workspaceId?: string;
}

/** Raw aggregated metric data from a platform */
export interface PlatformMetrics {
  platformId: string;
  platformName: string;
  fetchedAt: Date;
  metrics: MetricRow[];
}

/** Single metric row */
export interface MetricRow {
  timestamp: Date;
  metricName: string;
  value: number;
  dimensions?: Record<string, string>;
}

/** Generated report result */
export interface ReportResult {
  reportId: string;
  name: string;
  status: 'completed' | 'partial' | 'failed';
  generatedAt: Date;
  timeRange: TimeRange;
  platforms: string[];
  charts: ChartImage[];
  summary: ReportSummary;
  dataFilePath?: string;
  errors?: string[];
  /** Owning workspace — set when the job carried a workspaceId */
  workspaceId?: string;
  /** Originating schedule, when generated from a recurring schedule */
  scheduledReportId?: string;
}

/** Rendered chart image reference */
export interface ChartImage {
  chartId: string;
  title: string;
  type: string;
  imagePath: string;
  width: number;
  height: number;
}

/** Report summary statistics */
export interface ReportSummary {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas?: number;
  platformBreakdown: PlatformBreakdown[];
  periodOverPeriod?: PeriodComparison;
}

/** Per-platform breakdown */
export interface PlatformBreakdown {
  platformId: string;
  platformName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

/** Period-over-period comparison */
export interface PeriodComparison {
  impressionsChange: number;
  clicksChange: number;
  spendChange: number;
  conversionsChange: number;
}

/** Export result */
export interface ExportResult {
  reportId: string;
  format: ExportFormat;
  filePath: string;
  fileSize: number;
  generatedAt: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

/** BullMQ report job data payload */
export interface ReportJobData {
  type: ReportJobType;
  scheduleId?: string;
  reportParams?: ReportParams;
  reportId?: string;
  format?: ExportFormat;
  emails?: string[];
}

/** Report schedule configuration */
export interface ReportSchedule {
  scheduleId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  timezone: string;
  reportParams: ReportParams;
  emailRecipients: string[];
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Email attachment */
export interface EmailAttachment {
  filename: string;
  path: string;
  contentType: string;
}

/** Worker configuration options */
export interface WorkerConfig {
  maxRetries: number;
  retryDelayMs: number;
  tempDir: string;
  outputDir: string;
  chartWidth: number;
  chartHeight: number;
  concurrency: number;
  redisUrl: string;
}

/** Default worker configuration */
export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  tempDir: '/tmp/report-worker',
  outputDir: '/tmp/report-worker/output',
  chartWidth: 800,
  chartHeight: 400,
  concurrency: 2,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
