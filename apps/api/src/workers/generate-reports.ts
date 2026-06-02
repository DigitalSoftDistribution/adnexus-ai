// ============================================================================
// Report Generation Worker
// ============================================================================
// Processes jobs from BullMQ 'reports' queue.
//
// Job types:
//   - 'scheduled': Generate recurring report from a schedule configuration
//   - 'on-demand': Generate one-time report from provided parameters
//   - 'export':    Export an existing report to PDF/CSV/XLSX
//
// Features:
//   - Multi-platform data aggregation
//   - Chart generation (Chart.js rendered to image via node-canvas)
//   - PDF generation (Puppeteer)
//   - CSV/Excel export
//   - Email delivery with attachments
//   - Progress tracking (0-100%)
//   - Retry on failure (3 attempts, exponential backoff)
//   - Cleanup of temporary files
//
// Dead Letter Queue:
//   - Failed jobs (after all retries exhausted) are moved to 'reports:dlq'
//   - DLQ jobs are stored with full context for manual inspection
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import {
  ReportJobData,
  ReportJobType,
  ReportParams,
  ReportResult,
  ExportResult,
  ExportFormat,
  ReportSchedule,
  EmailAttachment,
  WorkerConfig,
  DEFAULT_WORKER_CONFIG,
  ChartConfig,
} from '../types/report';

import { tempFileManager } from '../utils/temp-file-manager';
type TempFileManager = typeof tempFileManager;
import { ChartService } from '../services/chart-service';
import { PdfService } from '../services/pdf-service';
import { ExportService } from '../services/export-service';
import { EmailService, EmailConfig } from '../services/email-service';
import { DataAggregationService } from '../services/data-aggregation-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'reports';
const DLQ_NAME = 'reports:dlq';

/** Progress milestones for report generation (weighted) */
const PROGRESS_WEIGHTS = {
  DATA_AGGREGATION: 30,   // 0-30%
  CHART_GENERATION: 40,   // 30-70%
  PDF_EXPORT: 15,         // 70-85%
  EMAIL_DELIVERY: 10,     // 85-95%
  CLEANUP: 5,             // 95-100%
};

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

/** Error thrown when report generation fails */
export class ReportGenerationError extends Error {
  public readonly stage: string;
  public readonly recoverable: boolean;

  constructor(message: string, stage: string, recoverable = true) {
    super(message);
    this.name = 'ReportGenerationError';
    this.stage = stage;
    this.recoverable = recoverable;
  }
}

// ---------------------------------------------------------------------------
// Report Generation Worker
// ---------------------------------------------------------------------------

export class ReportGenerationWorker {
  private worker: Worker | null = null;
  private dlq: Queue | null = null;
  private redis: IORedis;
  private config: WorkerConfig;

  // Services
  private dataAggregation: DataAggregationService;
  private chartService: ChartService;
  private pdfService: PdfService;
  private exportService: ExportService;
  private emailService: EmailService | null = null;

  // Track active jobs for graceful shutdown
  private activeJobs: Map<string, Job> = new Map();
  private isShuttingDown = false;

  constructor(
    redisConnection: IORedis,
    config: Partial<WorkerConfig> = {},
    emailConfig?: EmailConfig
  ) {
    this.redis = redisConnection;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };

    // Initialize temp file manager (per-job instances created in processJob)
    const tempManager = tempFileManager;

    // Initialize services
    this.dataAggregation = new DataAggregationService();
    this.chartService = new ChartService(tempManager, this.config.chartWidth, this.config.chartHeight);
    this.pdfService = new PdfService(tempManager);
    this.exportService = new ExportService(tempManager);

    if (emailConfig) {
      this.emailService = new EmailService(emailConfig);
    }
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Start the BullMQ worker to process report jobs
   */
  start(): void {
    if (this.worker) {
      console.warn('[ReportGenerationWorker] Worker already running');
      return;
    }

    // Create dead letter queue for failed jobs
    this.dlq = new Queue(DLQ_NAME, { connection: this.redis });

    // Create the worker
    this.worker = new Worker<ReportJobData>(
      QUEUE_NAME,
      async (job: Job<ReportJobData>) => this.processJob(job),
      {
        connection: this.redis,
        concurrency: this.config.concurrency,
        limiter: {
          max: 10,
          duration: 60000, // 10 jobs per minute
        },
        stalledInterval: 30000, // Check for stalled jobs every 30s
      }
    );

    // Handle worker-level errors
    this.worker.on('error', (error) => {
      console.error('[ReportGenerationWorker] Worker error:', error);
    });

    // Handle stalled jobs (will be retried)
    this.worker.on('stalled', (jobId) => {
      console.warn(`[ReportGenerationWorker] Job ${jobId} stalled and will be retried`);
    });

    // Log completed jobs
    this.worker.on('completed', (job) => {
      console.log(`[ReportGenerationWorker] Job ${job.id} (${job.data.type}) completed successfully`);
      this.activeJobs.delete(job.id || '');
    });

    // Log failed jobs - move to DLQ if retries exhausted
    this.worker.on('failed', async (job, error) => {
      if (!job) return;

      console.error(`[ReportGenerationWorker] Job ${job.id} (${job.data.type}) failed:`, error.message);
      this.activeJobs.delete(job.id || '');

      // If all retries exhausted, move to dead letter queue
      if (job.attemptsMade >= this.config.maxRetries) {
        await this.moveToDeadLetterQueue(job, error as Error);
      }
    });

    console.log(`[ReportGenerationWorker] Worker started on queue "${QUEUE_NAME}" (concurrency: ${this.config.concurrency})`);
  }

  /**
   * Gracefully stop the worker
   */
  async stop(timeoutMs = 30000): Promise<void> {
    this.isShuttingDown = true;
    console.log('[ReportGenerationWorker] Shutting down gracefully...');

    // Wait for active jobs to complete (with timeout)
    const startTime = Date.now();
    while (this.activeJobs.size > 0 && Date.now() - startTime < timeoutMs) {
      console.log(`[ReportGenerationWorker] Waiting for ${this.activeJobs.size} active jobs...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Close worker
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    // Close DLQ
    if (this.dlq) {
      await this.dlq.close();
      this.dlq = null;
    }

    // Close services
    await this.pdfService.close();
    if (this.emailService) {
      await this.emailService.close();
    }

    console.log('[ReportGenerationWorker] Worker stopped');
  }

  // =========================================================================
  // Job Processing
  // =========================================================================

  /**
   * Main job processor - routes to appropriate handler based on job type
   */
  private async processJob(job: Job<ReportJobData>): Promise<unknown> {
    if (this.isShuttingDown) {
      throw new ReportGenerationError('Worker is shutting down', 'startup', false);
    }

    this.activeJobs.set(job.id || '', job);

    const { type } = job.data;
    console.log(`[ReportGenerationWorker] Processing job ${job.id} (type: ${type}, attempt: ${job.attemptsMade + 1}/${this.config.maxRetries})`);

    // Initialize per-job temp file manager
    const tempManager = tempFileManager;
    await tempManager.initialize();

    try {
      switch (type) {
        case 'scheduled':
          return await this.handleScheduledJob(job, tempManager);
        case 'on-demand':
          return await this.handleOnDemandJob(job, tempManager);
        case 'export':
          return await this.handleExportJob(job, tempManager);
        default:
          throw new ReportGenerationError(`Unknown job type: ${type}`, 'validation', false);
      }
    } catch (error) {
      // Clean up temp files on any error (except if retry will happen)
      const willRetry = (job.attemptsMade + 1) < this.config.maxRetries;
      if (!willRetry) {
        await tempManager.cleanup();
      }
      throw error;
    }
  }

  // =========================================================================
  // Job Type Handlers
  // =========================================================================

  /**
   * Handle a scheduled report job
   */
  private async handleScheduledJob(job: Job<ReportJobData>, tempManager: TempFileManager): Promise<ReportResult> {
    const { scheduleId } = job.data;
    if (!scheduleId) {
      throw new ReportGenerationError('scheduleId is required for scheduled jobs', 'validation', false);
    }

    console.log(`[ReportGenerationWorker] [Job ${job.id}] Generating scheduled report: ${scheduleId}`);

    // Fetch schedule configuration from Redis/database
    const schedule = await this.loadSchedule(scheduleId);
    if (!schedule) {
      throw new ReportGenerationError(`Schedule not found: ${scheduleId}`, 'data-loading', false);
    }

    if (!schedule.isActive) {
      console.log(`[ReportGenerationWorker] [Job ${job.id}] Schedule ${scheduleId} is inactive, skipping`);
      throw new ReportGenerationError('Schedule is inactive', 'validation', false);
    }

    // Generate the report using schedule parameters
    const result = await this.generateReport(schedule.reportParams, job, tempManager);

    // Send email if recipients are configured
    if (schedule.emailRecipients && schedule.emailRecipients.length > 0) {
      await this.sendReportEmailWithReport(result.reportId, schedule.emailRecipients, result, tempManager);
    }

    // Update schedule metadata
    await this.updateScheduleLastRun(scheduleId);

    // Final cleanup
    await tempManager.cleanup();
    await job.updateProgress(100);

    return result;
  }

  /**
   * Handle an on-demand report job
   */
  private async handleOnDemandJob(job: Job<ReportJobData>, tempManager: TempFileManager): Promise<ReportResult> {
    const { reportParams } = job.data;
    if (!reportParams) {
      throw new ReportGenerationError('reportParams are required for on-demand jobs', 'validation', false);
    }

    console.log(`[ReportGenerationWorker] [Job ${job.id}] Generating on-demand report: ${reportParams.name}`);

    // Validate parameters
    this.validateReportParams(reportParams);

    // Generate the report
    const result = await this.generateReport(reportParams, job, tempManager);

    // Send email if recipients are provided
    if (reportParams.emailRecipients && reportParams.emailRecipients.length > 0) {
      await this.sendReportEmailWithReport(result.reportId, reportParams.emailRecipients, result, tempManager);
    }

    // Final cleanup
    await tempManager.cleanup();
    await job.updateProgress(100);

    return result;
  }

  /**
   * Handle an export job (PDF/CSV/XLSX)
   */
  private async handleExportJob(job: Job<ReportJobData>, tempManager: TempFileManager): Promise<ExportResult> {
    const { reportId, format, emails } = job.data;
    if (!reportId) {
      throw new ReportGenerationError('reportId is required for export jobs', 'validation', false);
    }
    if (!format) {
      throw new ReportGenerationError('format is required for export jobs', 'validation', false);
    }

    console.log(`[ReportGenerationWorker] [Job ${job.id}] Exporting report ${reportId} as ${format}`);

    await job.updateProgress(10);

    // Load the existing report
    const report = await this.loadReport(reportId);
    if (!report) {
      throw new ReportGenerationError(`Report not found: ${reportId}`, 'data-loading', false);
    }

    await job.updateProgress(30);

    // Generate export based on format
    let exportResult: ExportResult;

    if (format === 'pdf') {
      // PDF requires chart re-rendering
      const chartService = new ChartService(tempManager, this.config.chartWidth, this.config.chartHeight);
      const charts = await chartService.renderCharts(report.charts.map(c => ({
        type: c.type as ChartConfig['type'],
        title: c.title,
        data: { labels: [], datasets: [] }, // Charts would be reconstructed from stored data
      })));
      const pdfPath = await this.pdfService.generatePdf(report, charts);
      const fileSize = await tempManager.getFileSize(pdfPath);
      exportResult = {
        reportId,
        format: 'pdf',
        filePath: pdfPath,
        fileSize,
        generatedAt: new Date(),
      };
    } else {
      exportResult = await this.exportService.exportReport(report, format);
    }

    await job.updateProgress(80);

    // Send email with export if requested
    if (emails && emails.length > 0) {
      await this.sendExportEmail(reportId, emails, exportResult, report.name);
    }

    await job.updateProgress(100);

    // Cleanup temp files after sending
    await tempManager.cleanup();

    return exportResult;
  }

  // =========================================================================
  // Core Report Generation
  // =========================================================================

  /**
   * Generate a report from parameters - the core generation pipeline
   */
  public async generateReport(
    params: ReportParams,
    job?: Job,
    existingTempManager?: TempFileManager
  ): Promise<ReportResult> {
    const reportId = `rpt_${uuidv4()}`;
    const errors: string[] = [];

    const tempManager = existingTempManager || tempFileManager;
    if (!existingTempManager) {
      await tempManager.initialize();
    }

    try {
      // ------------------------------------------------------------------
      // Stage 1: Data Aggregation (0-30%)
      // ------------------------------------------------------------------
      await job?.updateProgress(5);
      console.log(`[ReportGenerationWorker] [${reportId}] Stage 1: Aggregating data from ${params.platforms.length} platforms`);

      const platformMetrics = await this.dataAggregation.fetchAllPlatformMetrics(
        params.platforms,
        params.timeRange,
        (platformId, status, error) => {
          console.log(`[ReportGenerationWorker] [${reportId}] Platform ${platformId}: ${status}${error ? ` (${error})` : ''}`);
        }
      );

      // Check if we have any data
      const hasData = platformMetrics.some(pm => pm.metrics.length > 0);
      if (!hasData) {
        throw new ReportGenerationError(
          'No data available from any platform',
          'data-aggregation',
          true
        );
      }

      await job?.updateProgress(30);

      // ------------------------------------------------------------------
      // Stage 2: Compute Summary Statistics (30-35%)
      // ------------------------------------------------------------------
      console.log(`[ReportGenerationWorker] [${reportId}] Stage 2: Computing summary statistics`);

      // TODO: Fetch previous period metrics for period-over-period comparison
      const summary = this.dataAggregation.computeReportSummary(platformMetrics);

      await job?.updateProgress(35);

      // ------------------------------------------------------------------
      // Stage 3: Chart Generation (35-75%)
      // ------------------------------------------------------------------
      console.log(`[ReportGenerationWorker] [${reportId}] Stage 3: Generating ${params.charts.length} charts`);

      const chartService = new ChartService(tempManager, this.config.chartWidth, this.config.chartHeight);

      // Enrich chart data with aggregated metrics
      const enrichedCharts = this.enrichChartConfigs(params.charts, platformMetrics, params.timeRange);
      const chartImages = await chartService.renderCharts(enrichedCharts);

      await job?.updateProgress(75);

      // ------------------------------------------------------------------
      // Stage 4: PDF Generation (75-90%)
      // ------------------------------------------------------------------
      console.log(`[ReportGenerationWorker] [${reportId}] Stage 4: Generating PDF`);

      const reportResult: ReportResult = {
        reportId,
        name: params.name,
        status: errors.length > 0 ? 'partial' : 'completed',
        generatedAt: new Date(),
        timeRange: params.timeRange,
        platforms: params.platforms.map(p => p.platformName),
        charts: chartImages,
        summary,
        errors: errors.length > 0 ? errors : undefined,
      };

      const pdfPath = await this.pdfService.generatePdf(reportResult, chartImages);
      reportResult.dataFilePath = pdfPath;

      await job?.updateProgress(90);

      // ------------------------------------------------------------------
      // Stage 5: Persist Report (90-95%)
      // ------------------------------------------------------------------
      console.log(`[ReportGenerationWorker] [${reportId}] Stage 5: Persisting report`);

      await this.persistReport(reportResult);

      await job?.updateProgress(95);

      console.log(`[ReportGenerationWorker] [${reportId}] Report generation completed (${reportResult.status})`);

      return reportResult;
    } catch (error) {
      console.error(`[ReportGenerationWorker] [${reportId}] Report generation failed:`, error);

      if (error instanceof ReportGenerationError) {
        throw error;
      }

      throw new ReportGenerationError(
        `Report generation failed: ${(error as Error).message}`,
        'unknown',
        true
      );
    }
  }

  // =========================================================================
  // Public API Methods
  // =========================================================================

  /**
   * Generate a scheduled report by schedule ID
   */
  async generateScheduledReport(scheduleId: string): Promise<ReportResult> {
    const tempManager = tempFileManager;
    await tempManager.initialize();

    try {
      const schedule = await this.loadSchedule(scheduleId);
      if (!schedule) {
        throw new ReportGenerationError(`Schedule not found: ${scheduleId}`, 'data-loading', false);
      }

      const result = await this.generateReport(schedule.reportParams, undefined, tempManager);

      if (schedule.emailRecipients && schedule.emailRecipients.length > 0) {
        await this.sendReportEmailWithReport(result.reportId, schedule.emailRecipients, result, tempManager);
      }

      await this.updateScheduleLastRun(scheduleId);
      return result;
    } finally {
      await tempManager.cleanup();
    }
  }

  /**
   * Generate an on-demand report from parameters
   */
  async generateOnDemandReport(params: ReportParams): Promise<ReportResult> {
    this.validateReportParams(params);

    const tempManager = tempFileManager;
    await tempManager.initialize();

    try {
      const result = await this.generateReport(params, undefined, tempManager);

      if (params.emailRecipients && params.emailRecipients.length > 0) {
        await this.sendReportEmailWithReport(result.reportId, params.emailRecipients, result, tempManager);
      }

      return result;
    } finally {
      await tempManager.cleanup();
    }
  }

  /**
   * Export an existing report to the specified format
   */
  async exportReport(reportId: string, format: ExportFormat): Promise<ExportResult> {
    const report = await this.loadReport(reportId);
    if (!report) {
      throw new ReportGenerationError(`Report not found: ${reportId}`, 'data-loading', false);
    }

    const tempManager = tempFileManager;
    await tempManager.initialize();

    try {
      if (format === 'pdf') {
        const chartService = new ChartService(tempManager, this.config.chartWidth, this.config.chartHeight);
        const charts = await chartService.renderCharts(report.charts.map(c => ({
          type: c.type as ChartConfig['type'],
          title: c.title,
          data: { labels: [], datasets: [] },
        })));
        const pdfPath = await this.pdfService.generatePdf(report, charts);
        const fileSize = await tempManager.getFileSize(pdfPath);

        return {
          reportId,
          format: 'pdf',
          filePath: pdfPath,
          fileSize,
          generatedAt: new Date(),
        };
      }

      return await this.exportService.exportReport(report, format);
    } finally {
      // Note: We don't cleanup here because the caller needs the file
      // Cleanup should be done after the file is delivered/downloaded
    }
  }

  /**
   * Send a report via email with all attachments
   */
  async sendReportEmail(reportId: string, emails: string[]): Promise<void> {
    if (!this.emailService) {
      throw new ReportGenerationError('Email service not configured', 'email', false);
    }

    const report = await this.loadReport(reportId);
    if (!report) {
      throw new ReportGenerationError(`Report not found: ${reportId}`, 'data-loading', false);
    }

    const tempManager = tempFileManager;
    await tempManager.initialize();

    try {
      await this.sendReportEmailWithAttachments(reportId, emails, report, tempManager);
    } finally {
      await tempManager.cleanup();
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Send report email with PDF attachment (has pre-loaded report + temp manager)
   */
  private async sendReportEmailWithReport(
    reportId: string,
    emails: string[],
    report: ReportResult,
    tempManager: TempFileManager
  ): Promise<void> {
    if (!this.emailService) {
      console.log(`[ReportGenerationWorker] Email service not configured, skipping email for ${reportId}`);
      return;
    }

    await this.sendReportEmailWithAttachments(reportId, emails, report, tempManager);
  }

  /**
   * Internal method to send report email with attachments
   */
  private async sendReportEmailWithAttachments(
    reportId: string,
    emails: string[],
    report: ReportResult,
    tempManager: TempFileManager
  ): Promise<void> {
    if (!this.emailService) return;

    console.log(`[ReportGenerationWorker] [${reportId}] Sending email to ${emails.join(', ')}`);

    const attachments: EmailAttachment[] = [];

    // Attach PDF
    if (report.dataFilePath) {
      attachments.push({
        filename: `${report.name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        path: report.dataFilePath,
        contentType: 'application/pdf',
      });
    }

    // Attach chart images
    for (const chart of report.charts) {
      attachments.push({
        filename: `${chart.title.replace(/[^a-z0-9]/gi, '_')}.png`,
        path: chart.imagePath,
        contentType: 'image/png',
      });
    }

    await this.emailService.sendReportEmail(
      emails,
      `Report: ${report.name}`,
      report.name,
      attachments,
      {
        htmlBody: `
          <p>Your report <strong>${report.name}</strong> is attached.</p>
          <p>Summary:</p>
          <ul>
            <li>Impressions: ${report.summary.totalImpressions.toLocaleString()}</li>
            <li>Clicks: ${report.summary.totalClicks.toLocaleString()}</li>
            <li>Spend: $${report.summary.totalSpend.toFixed(2)}</li>
            <li>CTR: ${(report.summary.ctr * 100).toFixed(2)}%</li>
          </ul>
        `,
      }
    );

    console.log(`[ReportGenerationWorker] [${reportId}] Email sent successfully`);
  }

  /**
   * Send export file via email
   */
  private async sendExportEmail(
    reportId: string,
    emails: string[],
    exportResult: ExportResult,
    reportName: string
  ): Promise<void> {
    if (!this.emailService) return;

    const ext = exportResult.format === 'xlsx' ? 'xlsx' : exportResult.format;
    const contentType = exportResult.format === 'csv'
      ? 'text/csv'
      : exportResult.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

    await this.emailService.sendReportEmail(
      emails,
      `Export: ${reportName} (${exportResult.format.toUpperCase()})`,
      reportName,
      [{
        filename: `${reportName.replace(/[^a-z0-9]/gi, '_')}.${ext}`,
        path: exportResult.filePath,
        contentType,
      }]
    );

    console.log(`[ReportGenerationWorker] [${reportId}] Export email sent to ${emails.join(', ')}`);
  }

  /**
   * Move a failed job to the dead letter queue after all retries exhausted
   */
  private async moveToDeadLetterQueue(job: Job<ReportJobData>, error: Error): Promise<void> {
    if (!this.dlq) return;

    try {
      await this.dlq.add(
        'failed-report',
        {
          originalJobId: job.id,
          originalQueue: QUEUE_NAME,
          jobData: job.data,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          failedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
        },
        {
          attempts: 1, // DLQ jobs are not retried
          removeOnComplete: false,
          removeOnFail: false,
        }
      );

      console.log(`[ReportGenerationWorker] Job ${job.id} moved to dead letter queue`);
    } catch (dlqError) {
      console.error(`[ReportGenerationWorker] Failed to move job ${job.id} to DLQ:`, dlqError);
    }
  }

  /**
   * Enrich chart configurations with actual aggregated data
   */
  private enrichChartConfigs(
    charts: ChartConfig[],
    platformMetrics: import('../types/report').PlatformMetrics[],
    timeRange: import('../types/report').TimeRange
  ): ChartConfig[] {
    return charts.map(chart => {
      // If chart already has data, use it; otherwise generate from metrics
      if (chart.data.labels.length > 0) {
        return chart;
      }

      // Generate time-series data for the chart based on its title/type
      const metricName = this.inferMetricName(chart.title, chart.type);
      const tsData = this.dataAggregation.getTimeSeriesData(
        platformMetrics,
        metricName,
        timeRange.granularity
      );

      // Create datasets per platform
      const datasets = platformMetrics.map((pm, index) => {
        const platformTs = this.dataAggregation.getTimeSeriesData(
          [pm],
          metricName,
          timeRange.granularity
        );
        return {
          label: pm.platformName,
          data: platformTs.values,
        };
      });

      // If only one platform, use the aggregated data
      const labels = tsData.labels.length > 0 ? tsData.labels : this.generateDefaultLabels(timeRange);
      const finalDatasets = datasets.length > 0 ? datasets : [{
        label: metricName,
        data: tsData.values.length > 0 ? tsData.values : labels.map(() => 0),
      }];

      return {
        ...chart,
        data: {
          labels,
          datasets: finalDatasets,
        },
      };
    });
  }

  /**
   * Infer the metric name from chart title and type
   */
  private inferMetricName(title: string, type: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('impression')) return 'impressions';
    if (titleLower.includes('click')) return 'clicks';
    if (titleLower.includes('spend') || titleLower.includes('cost')) return 'spend';
    if (titleLower.includes('conversion')) return 'conversions';
    if (titleLower.includes('ctr')) return 'ctr';
    // Default based on chart type
    if (type === 'pie' || type === 'doughnut') return 'spend';
    return 'impressions';
  }

  /**
   * Generate default date labels for a time range
   */
  private generateDefaultLabels(
    timeRange: import('../types/report').TimeRange
  ): string[] {
    const labels: string[] = [];
    const current = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    while (current <= end) {
      switch (timeRange.granularity) {
        case 'hourly':
          labels.push(current.toISOString().slice(0, 13) + ':00');
          current.setHours(current.getHours() + 1);
          break;
        case 'daily':
          labels.push(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          labels.push(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          labels.push(current.toISOString().slice(0, 7));
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return labels;
  }

  /**
   * Validate report parameters
   */
  private validateReportParams(params: ReportParams): void {
    if (!params.name || params.name.trim().length === 0) {
      throw new ReportGenerationError('Report name is required', 'validation', false);
    }
    if (!params.timeRange || !params.timeRange.start || !params.timeRange.end) {
      throw new ReportGenerationError('Valid timeRange is required', 'validation', false);
    }
    if (!params.platforms || params.platforms.length === 0) {
      throw new ReportGenerationError('At least one platform source is required', 'validation', false);
    }
    if (!params.charts) {
      throw new ReportGenerationError('Charts configuration is required', 'validation', false);
    }
  }

  // =========================================================================
  // Data Access (placeholder implementations - replace with actual DB calls)
  // =========================================================================

  /**
   * Load a schedule configuration by ID
   */
  private async loadSchedule(scheduleId: string): Promise<ReportSchedule | null> {
    // TODO: Implement with actual database/repository call
    // const schedule = await scheduleRepository.findById(scheduleId);
    // return schedule;

    // Placeholder: try loading from Redis
    const data = await this.redis.get(`schedule:${scheduleId}`);
    if (data) {
      return JSON.parse(data) as ReportSchedule;
    }
    return null;
  }

  /**
   * Load a generated report by ID
   */
  private async loadReport(reportId: string): Promise<ReportResult | null> {
    // TODO: Implement with actual database/repository call
    // const report = await reportRepository.findById(reportId);
    // return report;

    // Placeholder: try loading from Redis
    const data = await this.redis.get(`report:${reportId}`);
    if (data) {
      return JSON.parse(data) as ReportResult;
    }
    return null;
  }

  /**
   * Persist a generated report
   */
  private async persistReport(report: ReportResult): Promise<void> {
    // TODO: Implement with actual database/repository call
    // await reportRepository.save(report);

    // Placeholder: store in Redis with TTL of 7 days
    await this.redis.setex(
      `report:${report.reportId}`,
      7 * 24 * 3600,
      JSON.stringify(report)
    );

    console.log(`[ReportGenerationWorker] [${report.reportId}] Report persisted to storage`);
  }

  /**
   * Update schedule's last run timestamp
   */
  private async updateScheduleLastRun(scheduleId: string): Promise<void> {
    // TODO: Implement with actual database/repository call
    // await scheduleRepository.updateLastRun(scheduleId, new Date());

    // Placeholder: update in Redis
    const data = await this.redis.get(`schedule:${scheduleId}`);
    if (data) {
      const schedule = JSON.parse(data) as ReportSchedule;
      schedule.lastRunAt = new Date();
      await this.redis.setex(
        `schedule:${scheduleId}`,
        30 * 24 * 3600,
        JSON.stringify(schedule)
      );
    }
  }
}

// ============================================================================
// Factory Function for Easy Instantiation
// ============================================================================

/**
 * Create and start a ReportGenerationWorker with the given configuration
 */
export async function createReportWorker(
  redisUrl: string,
  config?: Partial<WorkerConfig>,
  emailConfig?: EmailConfig
): Promise<ReportGenerationWorker> {
  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const worker = new ReportGenerationWorker(redis, config, emailConfig);
  worker.start();

  return worker;
}

// ============================================================================
// Queue Helper Functions
// ============================================================================

/**
 * Add a scheduled report job to the queue
 */
export async function addScheduledReportJob(
  queue: Queue,
  scheduleId: string,
  runAt?: Date
): Promise<Job> {
  return queue.add(
    'scheduled-report',
    { type: 'scheduled' as ReportJobType, scheduleId },
    {
      delay: runAt ? runAt.getTime() - Date.now() : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}

/**
 * Add an on-demand report job to the queue
 */
export async function addOnDemandReportJob(
  queue: Queue,
  params: ReportParams,
  priority = 5
): Promise<Job> {
  return queue.add(
    'on-demand-report',
    { type: 'on-demand' as ReportJobType, reportParams: params },
    {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}

/**
 * Add an export job to the queue
 */
export async function addExportJob(
  queue: Queue,
  reportId: string,
  format: ExportFormat,
  emails?: string[]
): Promise<Job> {
  return queue.add(
    'export-report',
    { type: 'export' as ReportJobType, reportId, format, emails },
    {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}
