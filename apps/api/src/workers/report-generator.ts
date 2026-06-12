/**
 * AdNexus AI — Scheduled Report Generator Worker
 *
 * BullMQ worker that executes scheduled reports with multi-format output.
 * Worker startup is gated by BACKGROUND_JOBS_ENABLED and
 * BACKGROUND_REPORT_GENERATOR_ENABLED (default-off, PR #79 pattern).
 */

import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { supabase } from '../lib/supabase';
import { config } from '../config';
import { getRedisClient } from '../lib/redis';
import { AppError, NotFoundError } from '../lib/errors';
import { EmailService, type EmailConfig } from '../services/email-service';
import { createNotification } from '../services/notification-service';
import type { Platform } from '../types';

import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('report-generator');

export const REPORT_GENERATOR_QUEUE_NAME = 'report-generator';

export type ReportGeneratorWorkerStatus = 'disabled' | 'starting' | 'running' | 'stopped' | 'error';

export interface ReportGeneratorWorkerSnapshot {
  status: ReportGeneratorWorkerStatus;
  enabled: boolean;
  reason?: string;
  startedAt?: string;
}

export interface ReportGeneratorJobData {
  reportId: string;
  workspaceId: string;
}

// ─── Types ───────────────────────────────────────────────────

export type ReportType =
  | 'performance_summary'
  | 'campaign_comparison'
  | 'platform_breakdown'
  | 'creative_analysis'
  | 'budget_pacing'
  | 'goal_progress'
  | 'custom';

export type ReportStatus = 'completed' | 'failed' | 'partial';

export interface ScheduledReport {
  id: string;
  workspace_id: string;
  name: string;
  type: ReportType;
  config: ReportConfig;
  schedule_cron: string;
  status: 'active' | 'paused' | 'draft';
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportConfig {
  dateRange?: 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'custom';
  dateStart?: string;
  dateEnd?: string;
  platforms?: Platform[];
  campaignIds?: string[];
  metrics?: string[];
  recipients?: string[];
  emailSubject?: string;
  includeCharts?: boolean;
  compareWithPrevious?: boolean;
  goalId?: string;
  customFilters?: Record<string, unknown>;
}

export interface GeneratedReport {
  title: string;
  type: ReportType;
  dateRange: { start: string; end: string };
  generatedAt: string;
  summary: Record<string, unknown>;
  sections: ReportSection[];
  html: string;
  json: Record<string, unknown>;
}

export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'text' | 'metrics' | 'alert';
  data: unknown;
}

export interface ReportResultRow {
  id: string;
  scheduled_report_id: string;
  workspace_id: string;
  content: Record<string, unknown>;
  html_content: string | null;
  recipients: string[] | null;
  sent_at: string | null;
  status: ReportStatus;
  error_message: string | null;
  created_at: string;
}

// ─── Lazy worker state ───────────────────────────────────────

let workerRedis: Redis | null = null;
let reportGeneratorQueue: Queue<ReportGeneratorJobData> | null = null;
let reportGeneratorWorker: Worker<ReportGeneratorJobData> | null = null;
let reportEmailService: EmailService | null = null;
let workerSnapshot: ReportGeneratorWorkerSnapshot = {
  status: 'disabled',
  enabled: false,
};

export function getReportGeneratorDisableReason(): string | null {
  if (!config.backgroundJobs.enabled) {
    return 'BACKGROUND_JOBS_ENABLED is not true';
  }
  if (!config.backgroundJobs.reportGeneratorEnabled) {
    return 'BACKGROUND_REPORT_GENERATOR_ENABLED is not true';
  }
  if (!config.redis.url) {
    return 'REDIS_URL is not configured';
  }

  const redis = getRedisClient();
  if (!redis || redis.status !== 'ready') {
    return `Redis is not ready: ${redis?.status ?? 'disconnected'}`;
  }

  return null;
}

export function getReportGeneratorWorkerStatus(): ReportGeneratorWorkerSnapshot {
  return { ...workerSnapshot };
}

export function buildReportGeneratorJobId(reportId: string, timestamp = Date.now()): string {
  return `report-${reportId}-${timestamp}`;
}

function getWorkerRedis(): Redis {
  if (!workerRedis) {
    workerRedis = new Redis(config.redis.url ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return workerRedis;
}

function getReportGeneratorQueue(): Queue<ReportGeneratorJobData> {
  if (!reportGeneratorQueue) {
    reportGeneratorQueue = new Queue<ReportGeneratorJobData>(REPORT_GENERATOR_QUEUE_NAME, {
      connection: getWorkerRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });
  }
  return reportGeneratorQueue;
}

function getReportEmailConfig(): EmailConfig | null {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    return null;
  }

  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  return {
    smtpHost,
    smtpPort,
    smtpSecure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromAddress: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@adnexus.ai',
    fromName: process.env.EMAIL_FROM_NAME || 'AdNexus AI',
  };
}

function getReportEmailService(): EmailService | null {
  if (reportEmailService) {
    return reportEmailService;
  }

  const emailConfig = getReportEmailConfig();
  if (!emailConfig) {
    return null;
  }

  reportEmailService = new EmailService(emailConfig);
  return reportEmailService;
}

async function deliverReportEmail(
  recipients: string[],
  subject: string,
  html: string,
  reportName: string,
): Promise<void> {
  const emailService = getReportEmailService();
  if (!emailService) {
    logger.warn('[Report Generator] SMTP not configured; skipping email delivery');
    return;
  }

  await emailService.sendReportEmail(recipients, subject, reportName, [], { htmlBody: html });
}

// ─── Cron Parser (lightweight, no external dep) ──────────────

const CRON_PRESETS: Record<string, string> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
};

/** Parse a cron expression and return the next run time */
export function calculateNextRun(cronExpression: string, timezone?: string): Date {
  const normalized = CRON_PRESETS[cronExpression] ?? cronExpression;
  const parts = normalized.trim().split(/\s+/);

  if (parts.length !== 5) {
    logger.error(`[Report Generator] Invalid cron expression "${cronExpression}", falling back to @daily`);
    return getNextDailyRun(timezone);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = timezone ? getZonedDate(timezone) : new Date();

  // Check for simple preset patterns and delegate
  if (isEveryNMinutes(normalized)) {
    const n = parseInt(normalized.split('/')[1], 10);
    return addMinutes(now, n);
  }
  if (isEveryNHours(normalized)) {
    const n = parseInt(normalized.split('/')[1], 10);
    return addHours(now, n);
  }

  // Try pattern matching for common cases
  if (normalized === '0 0 * * *') return getNextDailyRun(timezone);
  if (normalized === '0 * * * *') return getNextHourlyRun(timezone);
  if (normalized === '0 0 * * 0') return getNextWeeklyRun(timezone);
  if (normalized === '0 0 1 * *') return getNextMonthlyRun(timezone);

  // Generic fallback: compute next occurrence by iterating forward
  return computeNextCronOccurrence(
    parseCronField(minute, 0, 59),
    parseCronField(hour, 0, 23),
    parseCronField(dayOfMonth, 1, 31),
    parseCronField(month, 1, 12),
    parseCronField(dayOfWeek, 0, 6),
    timezone,
  );
}

function isEveryNMinutes(expr: string): boolean {
  return /^\*\/\d+$/.test(expr);
}

function isEveryNHours(expr: string): boolean {
  const parts = expr.split(/\s+/);
  return parts.length === 5 && /^\*\/\d+$/.test(parts[1]);
}

function getZonedDate(tz: string): Date {
  try {
    const d = new Date();
    const zoned = new Date(d.toLocaleString('en-US', { timeZone: tz }));
    const offset = d.getTime() - zoned.getTime();
    return new Date(d.getTime() + offset);
  } catch {
    return new Date();
  }
}

function getNextDailyRun(timezone?: string): Date {
  const now = timezone ? getZonedDate(timezone) : new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  const diff = timezone ? (next.getTime() - now.getTime()) : (next.getTime() - Date.now());
  return new Date(Date.now() + diff);
}

function getNextHourlyRun(timezone?: string): Date {
  const now = timezone ? getZonedDate(timezone) : new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  const diff = timezone ? (next.getTime() - now.getTime()) : (next.getTime() - Date.now());
  return new Date(Date.now() + diff);
}

function getNextWeeklyRun(timezone?: string): Date {
  const now = timezone ? getZonedDate(timezone) : new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(0, 0, 0, 0);
  const diff = timezone ? (next.getTime() - now.getTime()) : (next.getTime() - Date.now());
  return new Date(Date.now() + diff);
}

function getNextMonthlyRun(timezone?: string): Date {
  const now = timezone ? getZonedDate(timezone) : new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1, 1);
  next.setHours(0, 0, 0, 0);
  const diff = timezone ? (next.getTime() - now.getTime()) : (next.getTime() - Date.now());
  return new Date(Date.now() + diff);
}

function addMinutes(date: Date, n: number): Date {
  const next = new Date(date.getTime() + n * 60_000);
  // Round up to next N-minute boundary
  const ms = next.getTime();
  const boundary = Math.ceil(ms / (n * 60_000)) * (n * 60_000);
  return new Date(boundary);
}

function addHours(date: Date, n: number): Date {
  const next = new Date(date.getTime() + n * 3_600_000);
  const ms = next.getTime();
  const boundary = Math.ceil(ms / (n * 3_600_000)) * (n * 3_600_000);
  return new Date(boundary);
}

interface CronField {
  values: number[];
  isWildcard: boolean;
  isStep: boolean;
  step?: number;
}

function parseCronField(field: string, min: number, max: number): CronField {
  if (field === '*') return { values: [], isWildcard: true, isStep: false };
  if (field === '?') return { values: [], isWildcard: true, isStep: false };

  // Step pattern: */5, 0-30/5
  const stepMatch = field.match(/^(.*?)(?:\/(\d+))?$/);
  if (stepMatch && stepMatch[2]) {
    const step = parseInt(stepMatch[2], 10);
    const range = stepMatch[1];
    if (range === '*' || range === '') {
      const vals: number[] = [];
      for (let i = min; i <= max; i += step) vals.push(i);
      return { values: vals, isWildcard: false, isStep: true, step };
    }
    const [rMin, rMax] = range.split('-').map(Number);
    const vals: number[] = [];
    for (let i = rMin; i <= (rMax ?? max); i += step) vals.push(i);
    return { values: vals, isWildcard: false, isStep: true, step };
  }

  // Range: 1-5
  if (field.includes('-')) {
    const [s, e] = field.split('-').map(Number);
    const vals: number[] = [];
    for (let i = s; i <= e; i++) vals.push(i);
    return { values: vals, isWildcard: false, isStep: false };
  }

  // List: 1,3,5
  if (field.includes(',')) {
    return {
      values: field.split(',').map(Number).filter((v) => !isNaN(v)),
      isWildcard: false,
      isStep: false,
    };
  }

  // Single value
  const val = parseInt(field, 10);
  if (!isNaN(val)) return { values: [val], isWildcard: false, isStep: false };

  return { values: [], isWildcard: true, isStep: false };
}

function computeNextCronOccurrence(
  minuteField: CronField,
  hourField: CronField,
  dayOfMonthField: CronField,
  monthField: CronField,
  dayOfWeekField: CronField,
  timezone?: string,
): Date {
  const now = timezone ? getZonedDate(timezone) : new Date();
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1); // Start from next minute

  // Safety: cap iterations at 366 days * 24 * 60 to avoid infinite loops
  const maxIterations = 527_040;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const m = candidate.getMinutes();
    const h = candidate.getHours();
    const dom = candidate.getDate();
    const mon = candidate.getMonth() + 1; // 1-based
    const dow = candidate.getDay();

    const matchMinute = minuteField.isWildcard || minuteField.values.includes(m);
    const matchHour = hourField.isWildcard || hourField.values.includes(h);
    const matchMonth = monthField.isWildcard || monthField.values.includes(mon);
    const matchDay =
      (dayOfMonthField.isWildcard || dayOfMonthField.values.includes(dom)) &&
      (dayOfWeekField.isWildcard || dayOfWeekField.values.includes(dow));

    if (matchMinute && matchHour && matchMonth && matchDay) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Fallback: return 24h from now if no match found
  logger.warn('[Report Generator] Cron iteration limit reached, falling back to +24h');
  return new Date(Date.now() + 24 * 3_600_000);
}

// ─── Date Range Resolver ─────────────────────────────────────

export function resolveDateRange(reportConfig: ReportConfig): { start: string; end: string } {
  const rangeType = reportConfig.dateRange ?? 'last_7d';
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (rangeType) {
    case 'last_7d': {
      const start = new Date(now.getTime() - 7 * 86400000);
      return { start: fmt(start), end: fmt(now) };
    }
    case 'last_14d': {
      const start = new Date(now.getTime() - 14 * 86400000);
      return { start: fmt(start), end: fmt(now) };
    }
    case 'last_30d': {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { start: fmt(start), end: fmt(now) };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'custom':
      if (reportConfig.dateStart && reportConfig.dateEnd) {
        return { start: reportConfig.dateStart, end: reportConfig.dateEnd };
      }
      // Fall through to default
      break;
    default:
      break;
  }

  // Default: last 7 days
  const start = new Date(now.getTime() - 7 * 86400000);
  return { start: fmt(start), end: fmt(now) };
}

// ─── Worker job processor ────────────────────────────────────

async function processReportGeneratorJob(job: Job<ReportGeneratorJobData>): Promise<Record<string, unknown>> {
    const { reportId, workspaceId } = job.data;
    logger.info(`[Report Generator] Executing report ${reportId} for workspace ${workspaceId} (attempt ${job.attemptsMade + 1})`);

    // 1. Fetch scheduled report configuration
    const { data: reportConfig, error: configError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', reportId)
      .eq('workspace_id', workspaceId)
      .single();

    if (configError || !reportConfig) {
      logger.error({ err: configError }, `[Report Generator] Report config not found: ${reportId}`);
      throw new NotFoundError('Scheduled report');
    }

    // Check if report is active
    if (reportConfig.status !== 'active') {
      logger.info(`[Report Generator] Report ${reportId} is not active (status: ${reportConfig.status}), skipping`);
      return { skipped: true, reason: `Report status is ${reportConfig.status}` };
    }

    const scheduledReport = reportConfig as unknown as ScheduledReport;
    const reportResult: GeneratedReport = await generateReport(scheduledReport);

    // 6. Store report result
    await storeReportResult(reportId, workspaceId, reportResult);

    // 7. Update scheduled_reports last_run_at and next_run_at
    const nextRunAt = calculateNextRun(scheduledReport.schedule_cron);
    const { error: updateError } = await supabase
      .from('scheduled_reports')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      logger.error({ err: updateError.message }, `[Report Generator] Failed to update scheduled report ${reportId}:`);
    }

    // 8. Email report to recipients if configured
    const recipients = scheduledReport.config.recipients ?? [];
    if (recipients.length > 0 && reportResult.html) {
      try {
        await deliverReportEmail(
          recipients,
          scheduledReport.config.emailSubject ?? `${scheduledReport.name} — AdNexus AI Report`,
          reportResult.html,
          scheduledReport.name,
        );
        logger.info(`[Report Generator] Emailed report ${reportId} to ${recipients.join(', ')}`);
      } catch (emailErr) {
        logger.error({ err: emailErr instanceof Error ? emailErr.message : String(emailErr) }, `[Report Generator] Failed to email report ${reportId}:`);
        // Don't fail the job — email failure is non-critical
      }
    }

    // 9. Create in-app notification
    try {
      await createNotification({
        workspaceId,
        type: 'system',
        title: `Report Ready: ${scheduledReport.name}`,
        message: `Your ${formatReportType(scheduledReport.type)} report has been generated for ${reportResult.dateRange.start} to ${reportResult.dateRange.end}.`,
        data: {
          report_id: reportId,
          report_name: scheduledReport.name,
          report_type: scheduledReport.type,
          date_range: reportResult.dateRange,
        },
      });
    } catch (notifErr) {
      logger.error({ err: notifErr instanceof Error ? notifErr.message : String(notifErr) }, `[Report Generator] Failed to create notification for report ${reportId}:`);
    }

    // 10. Return summary
    logger.info(`[Report Generator] Completed report ${reportId} with ${reportResult.sections.length} sections`);
    return {
      reportId,
      workspaceId,
      type: scheduledReport.type,
      sectionsGenerated: reportResult.sections.length,
      dateRange: reportResult.dateRange,
      emailedTo: recipients.length > 0 ? recipients : undefined,
    };
}

export async function startReportGeneratorWorker(): Promise<ReportGeneratorWorkerSnapshot> {
  const disableReason = getReportGeneratorDisableReason();
  if (disableReason) {
    workerSnapshot = {
      status: 'disabled',
      enabled: false,
      reason: disableReason,
    };
    return getReportGeneratorWorkerStatus();
  }

  if (reportGeneratorWorker) {
    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: workerSnapshot.startedAt,
    };
    return getReportGeneratorWorkerStatus();
  }

  workerSnapshot = { status: 'starting', enabled: true };

  try {
    const activeWorker = new Worker<ReportGeneratorJobData>(
      REPORT_GENERATOR_QUEUE_NAME,
      processReportGeneratorJob,
      {
        connection: getWorkerRedis(),
        concurrency: 2,
      },
    );

    activeWorker.on('completed', (job) => {
      logger.info(`[Report Generator] Job ${job.id} completed for report ${job.data.reportId}`);
    });

    activeWorker.on('failed', (job, err) => {
      const reportId = job?.data?.reportId ?? 'unknown';
      logger.error({ err: err.message }, `[Report Generator] Job ${job?.id} failed for report ${reportId}:`);
    });

    activeWorker.on('error', (err) => {
      logger.error({ err: err.message }, '[Report Generator] Worker error:');
    });

    reportGeneratorWorker = activeWorker;
    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workerSnapshot = {
      status: 'error',
      enabled: true,
      reason: message,
    };
  }

  return getReportGeneratorWorkerStatus();
}

export async function stopReportGeneratorWorker(): Promise<void> {
  if (reportGeneratorWorker) {
    await reportGeneratorWorker.close();
    reportGeneratorWorker = null;
  }
  if (reportGeneratorQueue) {
    await reportGeneratorQueue.close();
    reportGeneratorQueue = null;
  }
  if (workerRedis) {
    await workerRedis.quit();
    workerRedis = null;
  }
  if (reportEmailService) {
    await reportEmailService.close();
    reportEmailService = null;
  }

  workerSnapshot = {
    status: 'stopped',
    enabled: false,
  };
}

// ─── Job Trigger ─────────────────────────────────────────────

export async function triggerReportGeneration(reportId: string, workspaceId: string): Promise<string | null> {
  const disableReason = getReportGeneratorDisableReason();
  if (disableReason) {
    logger.info(`[Report Generator] Skipping enqueue: ${disableReason}`);
    return null;
  }

  const queue = getReportGeneratorQueue();
  const job = await queue.add(
    `report-${reportId}`,
    { reportId, workspaceId },
    {
      jobId: buildReportGeneratorJobId(reportId),
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  );
  logger.info(`[Report Generator] Queued report generation job ${job.id} for report ${reportId}`);
  return job.id ?? null;
}

// ─── Schedule Checker ────────────────────────────────────────

export async function checkScheduledReports(): Promise<void> {
  const disableReason = getReportGeneratorDisableReason();
  if (disableReason) {
    logger.info(`[Report Generator] Skipping scheduled report check: ${disableReason}`);
    return;
  }

  const now = new Date().toISOString();

  const { data: dueReports, error } = await supabase
    .from('scheduled_reports')
    .select('id, workspace_id, name, type, schedule_cron, status, next_run_at, last_run_at, config')
    .eq('status', 'active')
    .lte('next_run_at', now);

  if (error) {
    logger.error({ err: error.message }, '[Report Generator] Failed to query scheduled reports:');
    throw new AppError('SCHEDULED_REPORTS_QUERY_FAILED', `Failed to query scheduled reports: ${error.message}`, 500);
  }

  if (!dueReports || dueReports.length === 0) {
    return;
  }

  logger.info(`[Report Generator] Found ${dueReports.length} scheduled report(s) due for execution`);

  for (const report of dueReports) {
    try {
      await triggerReportGeneration(report.id, report.workspace_id);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, `[Report Generator] Failed to queue report ${report.id}:`);
    }
  }
}

// ─── Report Generation ───────────────────────────────────────

export async function generateReport(reportConfig: ScheduledReport): Promise<GeneratedReport> {
  const dateRange = resolveDateRange(reportConfig.config);
  const workspaceId = reportConfig.workspace_id;

  // Fetch campaign data for the workspace (via ad_accounts)
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, platform, name')
    .eq('workspace_id', workspaceId);

  const accountIds = (accounts ?? []).map((a) => a.id);
  const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));

  // Fetch campaigns for date range
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .in('ad_account_id', accountIds.length > 0 ? accountIds : ['no-accounts'])
    .gte('start_date', dateRange.start)
    .lte('start_date', dateRange.end);

  const campaignList = campaigns ?? [];

  // Fetch ads for creative analysis
  const campaignIds = campaignList.map((c) => c.id);
  const { data: adsData } = await supabase
    .from('ads')
    .select('*')
    .in('adset_id', (await supabase.from('adsets').select('id').in('campaign_id', campaignIds.length > 0 ? campaignIds : ['none'])).data?.map((a) => a.id) ?? ['none']);

  const adsList = adsData ?? [];

  // Fetch goals
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  const goalsList = goalsData ?? [];

  // Filter by requested platforms if specified
  const platformsFilter = reportConfig.config.platforms ?? [];
  const filteredCampaigns = platformsFilter.length > 0
    ? campaignList.filter((c) => {
        const acct = accountMap.get(c.ad_account_id);
        return acct && platformsFilter.includes(acct.platform as Platform);
      })
    : campaignList;

  // Build report based on type
  switch (reportConfig.type) {
    case 'performance_summary':
      return buildPerformanceSummary(reportConfig, filteredCampaigns, accountMap, dateRange);
    case 'campaign_comparison':
      return buildCampaignComparison(reportConfig, filteredCampaigns, accountMap, dateRange);
    case 'platform_breakdown':
      return buildPlatformBreakdown(reportConfig, filteredCampaigns, accountMap, dateRange);
    case 'creative_analysis':
      return buildCreativeAnalysis(reportConfig, filteredCampaigns, adsList, accountMap, dateRange);
    case 'budget_pacing':
      return buildBudgetPacing(reportConfig, filteredCampaigns, accountMap, dateRange);
    case 'goal_progress':
      return buildGoalProgress(reportConfig, goalsList, dateRange);
    case 'custom':
      return buildCustomReport(reportConfig, filteredCampaigns, adsList, goalsList, accountMap, dateRange);
    default:
      return buildPerformanceSummary(reportConfig, filteredCampaigns, accountMap, dateRange);
  }
}

// ─── Report Builders ─────────────────────────────────────────

function buildPerformanceSummary(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const totalSpend = campaigns.reduce((s, c) => s + ((c.spend as number) ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + ((c.impressions as number) ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + ((c.clicks as number) ?? 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + ((c.conversions as number) ?? 0), 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + ((c.roas as number) ?? 0), 0) / campaigns.length : 0;
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Platform breakdown for summary
  const byPlatform = new Map<string, { spend: number; conversions: number; roas: number; count: number }>();
  for (const c of campaigns) {
    const acct = accountMap.get(c.ad_account_id as string);
    const platform = (acct?.platform as string) ?? 'unknown';
    const curr = byPlatform.get(platform) ?? { spend: 0, conversions: 0, roas: 0, count: 0 };
    curr.spend += ((c.spend as number) ?? 0);
    curr.conversions += ((c.conversions as number) ?? 0);
    curr.roas += ((c.roas as number) ?? 0);
    curr.count += 1;
    byPlatform.set(platform, curr);
  }

  const platformRows = [...byPlatform.entries()].map(([platform, d]) => ({
    platform,
    spend: d.spend,
    conversions: d.conversions,
    roas: d.count > 0 ? d.roas / d.count : 0,
    cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
  }));

  const summary = {
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    avgRoas,
    avgCpa,
    ctr,
    campaignCount: campaigns.length,
  };

  const sections: ReportSection[] = [
    {
      title: 'Key Metrics',
      type: 'metrics',
      data: [
        { label: 'Total Spend', value: `$${formatNumber(totalSpend)}`, trend: null },
        { label: 'Impressions', value: formatNumber(totalImpressions), trend: null },
        { label: 'Clicks', value: formatNumber(totalClicks), trend: null },
        { label: 'CTR', value: `${ctr.toFixed(2)}%`, trend: null },
        { label: 'Conversions', value: formatNumber(totalConversions), trend: null },
        { label: 'Avg ROAS', value: `${avgRoas.toFixed(2)}x`, trend: null },
        { label: 'Avg CPA', value: `$${avgCpa.toFixed(2)}`, trend: null },
      ],
    },
    {
      title: 'Performance by Platform',
      type: 'table',
      data: {
        headers: ['Platform', 'Spend', 'Conversions', 'ROAS', 'CPA'],
        rows: platformRows.map((r) => [
          capitalize(r.platform),
          `$${formatNumber(r.spend)}`,
          formatNumber(r.conversions),
          `${r.roas.toFixed(2)}x`,
          `$${r.cpa.toFixed(2)}`,
        ]),
      },
    },
    {
      title: 'Top Campaigns by Spend',
      type: 'table',
      data: {
        headers: ['Campaign', 'Platform', 'Spend', 'Conversions', 'ROAS'],
        rows: [...campaigns]
          .sort((a, b) => ((b.spend as number) ?? 0) - ((a.spend as number) ?? 0))
          .slice(0, 10)
          .map((c) => {
            const acct = accountMap.get(c.ad_account_id as string);
            return [
              truncate(c.name as string, 40),
              capitalize((acct?.platform as string) ?? 'unknown'),
              `$${formatNumber((c.spend as number) ?? 0)}`,
              formatNumber((c.conversions as number) ?? 0),
              `${((c.roas as number) ?? 0).toFixed(2)}x`,
            ];
          }),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Performance Summary', dateRange, sections, summary);
  const json = { summary, platforms: platformRows, campaigns: campaigns.slice(0, 50) };

  return { title: config.name, type: 'performance_summary', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildCampaignComparison(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const sorted = [...campaigns].sort((a, b) => ((b.spend as number) ?? 0) - ((a.spend as number) ?? 0));

  const comparisonData = sorted.map((c) => {
    const acct = accountMap.get(c.ad_account_id as string);
    const spend = (c.spend as number) ?? 0;
    const conversions = (c.conversions as number) ?? 0;
    return {
      name: c.name as string,
      platform: (acct?.platform as string) ?? 'unknown',
      status: c.status as string,
      spend,
      impressions: (c.impressions as number) ?? 0,
      clicks: (c.clicks as number) ?? 0,
      conversions,
      ctr: ((c.impressions as number) ?? 0) > 0 ? (((c.clicks as number) ?? 0) / ((c.impressions as number) ?? 0)) * 100 : 0,
      roas: (c.roas as number) ?? 0,
      cpa: conversions > 0 ? spend / conversions : 0,
    };
  });

  const summary = {
    campaignCount: campaigns.length,
    totalSpend: campaigns.reduce((s, c) => s + ((c.spend as number) ?? 0), 0),
    avgRoas: campaigns.length > 0 ? campaigns.reduce((s, c) => s + ((c.roas as number) ?? 0), 0) / campaigns.length : 0,
  };

  const sections: ReportSection[] = [
    {
      title: 'Campaign Comparison',
      type: 'table',
      data: {
        headers: ['Campaign', 'Platform', 'Status', 'Spend', 'Impr.', 'Clicks', 'Conv.', 'ROAS'],
        rows: comparisonData.map((c) => [
          truncate(c.name, 35),
          capitalize(c.platform),
          c.status,
          `$${formatNumber(c.spend)}`,
          formatNumber(c.impressions),
          formatNumber(c.clicks),
          formatNumber(c.conversions),
          `${c.roas.toFixed(2)}x`,
        ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Campaign Comparison', dateRange, sections, summary);
  const json = { summary, comparison: comparisonData };

  return { title: config.name, type: 'campaign_comparison', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildPlatformBreakdown(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const byPlatform = new Map<string, { campaigns: typeof campaigns; spend: number; impressions: number; clicks: number; conversions: number; roas: number; count: number }>();

  for (const c of campaigns) {
    const acct = accountMap.get(c.ad_account_id as string);
    const platform = (acct?.platform as string) ?? 'unknown';
    const curr = byPlatform.get(platform) ?? { campaigns: [], spend: 0, impressions: 0, clicks: 0, conversions: 0, roas: 0, count: 0 };
    curr.campaigns.push(c);
    curr.spend += ((c.spend as number) ?? 0);
    curr.impressions += ((c.impressions as number) ?? 0);
    curr.clicks += ((c.clicks as number) ?? 0);
    curr.conversions += ((c.conversions as number) ?? 0);
    curr.roas += ((c.roas as number) ?? 0);
    curr.count += 1;
    byPlatform.set(platform, curr);
  }

  const platformData = [...byPlatform.entries()].map(([platform, d]) => ({
    platform,
    campaignCount: d.count,
    spend: d.spend,
    impressions: d.impressions,
    clicks: d.clicks,
    conversions: d.conversions,
    roas: d.count > 0 ? d.roas / d.count : 0,
    cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
  }));

  const summary = {
    platformCount: byPlatform.size,
    totalSpend: platformData.reduce((s, p) => s + p.spend, 0),
  };

  const sections: ReportSection[] = [
    {
      title: 'Platform Performance',
      type: 'table',
      data: {
        headers: ['Platform', 'Campaigns', 'Spend', 'Impressions', 'Clicks', 'Conv.', 'ROAS', 'CTR'],
        rows: platformData.map((p) => [
          capitalize(p.platform),
          String(p.campaignCount),
          `$${formatNumber(p.spend)}`,
          formatNumber(p.impressions),
          formatNumber(p.clicks),
          formatNumber(p.conversions),
          `${p.roas.toFixed(2)}x`,
          `${p.ctr.toFixed(2)}%`,
        ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Platform Breakdown', dateRange, sections, summary);
  const json = { summary, platforms: platformData };

  return { title: config.name, type: 'platform_breakdown', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildCreativeAnalysis(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  ads: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const sortedByRoas = [...ads].sort((a, b) => ((b.roas as number) ?? 0) - ((a.roas as number) ?? 0));
  const topCreatives = sortedByRoas.slice(0, 10);
  const bottomCreatives = sortedByRoas.reverse().slice(0, 10);

  const summary = {
    totalCreatives: ads.length,
    avgCtr: ads.length > 0 ? ads.reduce((s, a) => s + ((a.ctr as number) ?? 0), 0) / ads.length : 0,
    fatigueWarnings: ads.filter((a) => (a.fatigue_status as string) === 'warning').length,
    fatigueCritical: ads.filter((a) => (a.fatigue_status as string) === 'critical').length,
    fatigueExhausted: ads.filter((a) => (a.fatigue_status as string) === 'exhausted').length,
  };

  const sections: ReportSection[] = [
    {
      title: 'Creative Health Summary',
      type: 'metrics',
      data: [
        { label: 'Total Creatives', value: String(ads.length), trend: null },
        { label: 'Avg CTR', value: `${(summary.avgCtr * 100).toFixed(2)}%`, trend: null },
        { label: 'Warning', value: String(summary.fatigueWarnings), trend: 'neutral' },
        { label: 'Critical', value: String(summary.fatigueCritical), trend: 'down' },
        { label: 'Exhausted', value: String(summary.fatigueExhausted), trend: 'down' },
      ],
    },
    {
      title: 'Top 10 Creatives by ROAS',
      type: 'table',
      data: {
        headers: ['Creative', 'Type', 'Spend', 'Impressions', 'CTR', 'ROAS', 'Status'],
        rows: topCreatives.map((a) => [
          truncate(a.name as string, 35),
          (a.creative_type as string) ?? 'N/A',
          `$${formatNumber((a.spend as number) ?? 0)}`,
          formatNumber((a.impressions as number) ?? 0),
          `${(((a.ctr as number) ?? 0) * 100).toFixed(2)}%`,
          `${((a.roas as number) ?? 0).toFixed(2)}x`,
          a.fatigue_status as string,
        ]),
      },
    },
    {
      title: 'Bottom 10 Creatives by ROAS',
      type: 'table',
      data: {
        headers: ['Creative', 'Type', 'Spend', 'Impressions', 'CTR', 'ROAS', 'Status'],
        rows: bottomCreatives.map((a) => [
          truncate(a.name as string, 35),
          (a.creative_type as string) ?? 'N/A',
          `$${formatNumber((a.spend as number) ?? 0)}`,
          formatNumber((a.impressions as number) ?? 0),
          `${(((a.ctr as number) ?? 0) * 100).toFixed(2)}%`,
          `${((a.roas as number) ?? 0).toFixed(2)}x`,
          a.fatigue_status as string,
        ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Creative Analysis', dateRange, sections, summary);
  const json = { summary, topCreatives, bottomCreatives };

  return { title: config.name, type: 'creative_analysis', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildBudgetPacing(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const withBudget = campaigns.filter((c) => (c.daily_budget as number) ?? (c.lifetime_budget as number));

  const budgetData = withBudget.map((c) => {
    const budget = (c.daily_budget as number) ?? (c.lifetime_budget as number) ?? 0;
    const spend = (c.spend as number) ?? 0;
    const pctUsed = budget > 0 ? (spend / budget) * 100 : 0;
    const acct = accountMap.get(c.ad_account_id as string);
    return {
      name: c.name as string,
      platform: (acct?.platform as string) ?? 'unknown',
      budget,
      spend,
      pctUsed,
      remaining: Math.max(budget - spend, 0),
      budgetType: c.daily_budget ? 'daily' : 'lifetime',
      status: pctUsed >= 100 ? 'over' : pctUsed >= 90 ? 'critical' : pctUsed >= 75 ? 'warning' : 'on_track',
    };
  });

  const totalBudget = budgetData.reduce((s, c) => s + c.budget, 0);
  const totalSpend = budgetData.reduce((s, c) => s + c.spend, 0);

  const summary = {
    totalBudget,
    totalSpend,
    totalRemaining: totalBudget - totalSpend,
    pctUsed: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
    overBudget: budgetData.filter((c) => c.pctUsed >= 100).length,
    critical: budgetData.filter((c) => c.pctUsed >= 90 && c.pctUsed < 100).length,
    onTrack: budgetData.filter((c) => c.pctUsed < 75).length,
  };

  const sections: ReportSection[] = [
    {
      title: 'Budget Overview',
      type: 'metrics',
      data: [
        { label: 'Total Budget', value: `$${formatNumber(totalBudget)}`, trend: null },
        { label: 'Total Spend', value: `$${formatNumber(totalSpend)}`, trend: null },
        { label: 'Remaining', value: `$${formatNumber(summary.totalRemaining)}`, trend: null },
        { label: 'Used %', value: `${summary.pctUsed.toFixed(1)}%`, trend: summary.pctUsed > 90 ? 'down' : 'up' },
        { label: 'Over Budget', value: String(summary.overBudget), trend: 'down' },
        { label: 'Critical', value: String(summary.critical), trend: 'neutral' },
      ],
    },
    {
      title: 'Budget Pacing by Campaign',
      type: 'table',
      data: {
        headers: ['Campaign', 'Platform', 'Budget', 'Spend', 'Remaining', 'Used %', 'Status'],
        rows: budgetData
          .sort((a, b) => b.pctUsed - a.pctUsed)
          .map((c) => [
            truncate(c.name, 35),
            capitalize(c.platform),
            `$${formatNumber(c.budget)}`,
            `$${formatNumber(c.spend)}`,
            `$${formatNumber(c.remaining)}`,
            `${c.pctUsed.toFixed(1)}%`,
            c.status,
          ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Budget Pacing', dateRange, sections, summary);
  const json = { summary, campaigns: budgetData };

  return { title: config.name, type: 'budget_pacing', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildGoalProgress(
  config: ScheduledReport,
  goals: Array<Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const goalData = goals.map((g) => {
    const target = (g.target_value as number) ?? 0;
    const current = (g.current_value as number) ?? 0;
    const progress = target > 0 ? (current / target) * 100 : 0;
    return {
      name: g.name as string,
      type: g.goal_type as string,
      target,
      current,
      progress,
      status: g.status as string,
      startDate: g.start_date as string,
      endDate: g.end_date as string,
    };
  });

  const summary = {
    totalGoals: goals.length,
    onTrack: goals.filter((g) => (g.status as string) === 'active').length,
    atRisk: goals.filter((g) => (g.status as string) === 'at_risk').length,
    offTrack: goals.filter((g) => (g.status as string) === 'off_track').length,
    avgProgress: goalData.length > 0 ? goalData.reduce((s, g) => s + g.progress, 0) / goalData.length : 0,
  };

  const sections: ReportSection[] = [
    {
      title: 'Goal Progress Summary',
      type: 'metrics',
      data: [
        { label: 'Total Goals', value: String(summary.totalGoals), trend: null },
        { label: 'On Track', value: String(summary.onTrack), trend: 'up' },
        { label: 'At Risk', value: String(summary.atRisk), trend: 'neutral' },
        { label: 'Off Track', value: String(summary.offTrack), trend: 'down' },
        { label: 'Avg Progress', value: `${summary.avgProgress.toFixed(1)}%`, trend: null },
      ],
    },
    {
      title: 'Goal Details',
      type: 'table',
      data: {
        headers: ['Goal', 'Type', 'Target', 'Current', 'Progress', 'Status'],
        rows: goalData.map((g) => [
          truncate(g.name, 35),
          g.type.toUpperCase(),
          formatGoalValue(g.target, g.type),
          formatGoalValue(g.current, g.type),
          `${g.progress.toFixed(1)}%`,
          g.status,
        ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Goal Progress', dateRange, sections, summary);
  const json = { summary, goals: goalData };

  return { title: config.name, type: 'goal_progress', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

function buildCustomReport(
  config: ScheduledReport,
  campaigns: Array<Record<string, unknown>>,
  ads: Array<Record<string, unknown>>,
  goals: Array<Record<string, unknown>>,
  accountMap: Map<string, Record<string, unknown>>,
  dateRange: { start: string; end: string },
): GeneratedReport {
  const requestedMetrics = config.config.metrics ?? ['spend', 'conversions', 'roas'];

  const totalSpend = campaigns.reduce((s, c) => s + ((c.spend as number) ?? 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + ((c.conversions as number) ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + ((c.impressions as number) ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + ((c.clicks as number) ?? 0), 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + ((c.roas as number) ?? 0), 0) / campaigns.length : 0;

  const metricsData: Array<{ label: string; value: string }> = [];
  for (const metric of requestedMetrics) {
    switch (metric) {
      case 'spend':
        metricsData.push({ label: 'Total Spend', value: `$${formatNumber(totalSpend)}` });
        break;
      case 'conversions':
        metricsData.push({ label: 'Conversions', value: formatNumber(totalConversions) });
        break;
      case 'roas':
        metricsData.push({ label: 'Avg ROAS', value: `${avgRoas.toFixed(2)}x` });
        break;
      case 'impressions':
        metricsData.push({ label: 'Impressions', value: formatNumber(totalImpressions) });
        break;
      case 'clicks':
        metricsData.push({ label: 'Clicks', value: formatNumber(totalClicks) });
        break;
      case 'ctr':
        metricsData.push({
          label: 'CTR',
          value: `${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'}%`,
        });
        break;
      case 'cpa':
        metricsData.push({
          label: 'CPA',
          value: `$${totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0'}`,
        });
        break;
      case 'creatives':
        metricsData.push({ label: 'Total Creatives', value: String(ads.length) });
        break;
      case 'goals':
        metricsData.push({ label: 'Active Goals', value: String(goals.length) });
        break;
      default:
        break;
    }
  }

  const summary: Record<string, unknown> = {
    totalSpend,
    totalConversions,
    totalImpressions,
    totalClicks,
    avgRoas,
    campaignCount: campaigns.length,
    requestedMetrics,
  };

  const sections: ReportSection[] = [
    {
      title: 'Custom Metrics',
      type: 'metrics',
      data: metricsData,
    },
    {
      title: 'Campaign Summary',
      type: 'table',
      data: {
        headers: ['Campaign', 'Spend', 'Conversions', 'ROAS'],
        rows: campaigns
          .sort((a, b) => ((b.spend as number) ?? 0) - ((a.spend as number) ?? 0))
          .slice(0, 15)
          .map((c) => [
            truncate(c.name as string, 40),
            `$${formatNumber((c.spend as number) ?? 0)}`,
            formatNumber((c.conversions as number) ?? 0),
            `${((c.roas as number) ?? 0).toFixed(2)}x`,
          ]),
      },
    },
  ];

  const html = buildHtmlReport(config.name, 'Custom Report', dateRange, sections, summary);
  const json = { summary, campaigns: campaigns.slice(0, 50), ads: ads.slice(0, 50), goals: goals.slice(0, 20) };

  return { title: config.name, type: 'custom', dateRange, generatedAt: new Date().toISOString(), summary, sections, html, json };
}

// ─── HTML Report Builder ─────────────────────────────────────

function buildHtmlReport(
  reportName: string,
  reportTypeLabel: string,
  dateRange: { start: string; end: string },
  sections: ReportSection[],
  _summary: Record<string, unknown>,
): string {
  const sectionHtml = sections
    .map((section) => {
      if (section.type === 'metrics') {
        const metrics = section.data as Array<{ label: string; value: string; trend?: string | null }>;
        const metricsGrid = metrics
          .map(
            (m) => `
          <div style="flex:1;min-width:140px;padding:16px;background-color:#f5f5f5;border-radius:8px;text-align:center;margin:6px;">
            <p style="margin:0 0 4px;font-size:11px;color:#737373;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${escapeHtml(m.label)}</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#171717;">${escapeHtml(m.value)}</p>
          </div>`,
          )
          .join('');
        return `
          <div style="margin:24px 0;">
            <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#171717;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(section.title)}</h2>
            <div style="display:flex;flex-wrap:wrap;margin:-6px;">${metricsGrid}</div>
          </div>`;
      }

      if (section.type === 'table') {
        const table = section.data as { headers: string[]; rows: string[][] };
        const headerHtml = table.headers
          .map((h) => `<th style="padding:8px;text-align:left;font-size:11px;color:#737373;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;">${escapeHtml(h)}</th>`)
          .join('');
        const rowsHtml = table.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td style="padding:8px;font-size:13px;color:#171717;border-bottom:1px solid #f0f0f0;">${escapeHtml(cell)}</td>`).join('')}</tr>`,
          )
          .join('');
        return `
          <div style="margin:24px 0;">
            <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#171717;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(section.title)}</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <thead><tr>${headerHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
      }

      // Text section fallback
      return `
        <div style="margin:24px 0;">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#171717;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(section.title)}</h2>
          <p style="font-size:13px;color:#525252;">${escapeHtml(JSON.stringify(section.data))}</p>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(reportName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="700" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;width:100%;border-radius:12px;overflow:hidden;background-color:#ffffff;">
          <tr>
            <td style="background-color:#0a0a0a;padding:24px 32px;border-bottom:3px solid #c3f53b;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#c3f53b;letter-spacing:-0.5px;">&#9670; AdNexus AI</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a3a3a3;">${escapeHtml(reportTypeLabel)} &middot; ${dateRange.start} to ${dateRange.end}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a;letter-spacing:-0.5px;">${escapeHtml(reportName)}</h1>
              <p style="margin:0 0 20px;font-size:12px;color:#737373;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              ${sectionHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#737373;line-height:1.5;">Generated by AdNexus AI &middot; <a href="${config.frontend.url}" style="color:#525252;text-decoration:underline;">View Dashboard</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Report Storage ──────────────────────────────────────────

export async function storeReportResult(
  reportId: string,
  workspaceId: string,
  result: GeneratedReport,
): Promise<void> {
  const { error } = await supabase.from('report_results').insert({
    scheduled_report_id: reportId,
    workspace_id: workspaceId,
    content: result.json as Record<string, unknown>,
    html_content: result.html,
    status: 'completed',
  });

  if (error) {
    logger.error({ err: error.message }, `[Report Generator] Failed to store report result for ${reportId}:`);
    throw new AppError('REPORT_STORAGE_FAILED', `Failed to store report result: ${error.message}`, 500);
  }
}

// ─── Graceful Shutdown (legacy alias) ────────────────────────

export async function shutdownReportGenerator(): Promise<void> {
  logger.info('[Report Generator] Shutting down worker...');
  await stopReportGeneratorWorker();
  logger.info('[Report Generator] Worker shut down complete');
}

if (require.main === module) {
  void startReportGeneratorWorker().then((status) => {
    if (status.status !== 'running') {
      logger.info(`[Report Generator] Worker not started: ${status.reason ?? status.status}`);
      process.exit(0);
    }
    logger.info('[Report Generator] Worker started. Waiting for jobs...');
  });
}

export { reportGeneratorWorker, reportGeneratorQueue };

// ─── Helpers ─────────────────────────────────────────────────

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function formatReportType(type: ReportType): string {
  return type
    .split('_')
    .map((w) => capitalize(w))
    .join(' ');
}

function formatGoalValue(value: number, type: string): string {
  switch (type) {
    case 'roas':
      return `${value.toFixed(2)}x`;
    case 'ctr':
      return `${(value * 100).toFixed(2)}%`;
    case 'cpa':
    case 'spend':
      return `$${formatNumber(value)}`;
    default:
      return `${formatNumber(value)}`;
  }
}
