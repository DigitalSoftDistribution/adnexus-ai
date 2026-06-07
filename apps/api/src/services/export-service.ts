// ============================================================================
// Export Service
// Handles CSV, Excel (XLSX), and PDF export of campaign/report data
// ============================================================================

import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { ReportResult, ExportFormat, ExportResult } from '../types/report';
import { tempFileManager } from '../utils/temp-file-manager';
type TempFileManager = typeof tempFileManager;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = 'meta' | 'google' | 'tiktok' | 'snap';

export interface CampaignFilter {
  platform?: Platform;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  campaignIds?: string[];
}

export interface CSVExportOptions {
  columns?: string[];
  includeInsights?: boolean;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface ExcelExportOptions {
  includeAdsets?: boolean;
  includeAds?: boolean;
  template?: string;
}

export interface PDFExportOptions {
  title?: string;
  dateRange?: { start: string; end: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetchers
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch campaigns for export (scoped to workspace) */
export async function fetchCampaignsForExport(
  workspaceId: string,
  filter: CampaignFilter = {}
): Promise<any[]> {
  let query = supabase
    .from('campaigns')
    .select('id, name, platform, status, objective, budget, spend, impressions, clicks, ctr, conversions, cpa, roas, created_at')
    .eq('workspace_id', workspaceId);

  if (filter.platform) query = query.eq('platform', filter.platform);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom);
  if (filter.dateTo) query = query.lte('created_at', filter.dateTo);
  if (filter.campaignIds && filter.campaignIds.length > 0) query = query.in('id', filter.campaignIds);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(5000);

  if (error) throw new ExportError(`Failed to fetch campaigns: ${error.message}`);
  return data ?? [];
}

/** Fetch insights/metrics for export */
export async function fetchInsightsForExport(
  workspaceId: string,
  filter: CampaignFilter = {}
): Promise<any[]> {
  // Resolve campaign IDs scoped to workspace
  let campQuery = supabase.from('campaigns').select('id').eq('workspace_id', workspaceId);
  if (filter.platform) campQuery = campQuery.eq('platform', filter.platform);
  if (filter.status) campQuery = campQuery.eq('status', filter.status);
  if (filter.campaignIds && filter.campaignIds.length > 0) campQuery = campQuery.in('id', filter.campaignIds);

  const { data: campaigns, error: campErr } = await campQuery;
  if (campErr) throw new ExportError(`Failed to fetch campaigns: ${campErr.message}`);

  const ids = (campaigns ?? []).map((c) => c.id);
  if (ids.length === 0) return [];

  let metQuery = supabase
    .from('campaign_metrics')
    .select('campaign_id, date, impressions, clicks, spend, conversions, conversion_value, reach')
    .in('campaign_id', ids);

  if (filter.dateFrom) metQuery = metQuery.gte('date', filter.dateFrom);
  if (filter.dateTo) metQuery = metQuery.lte('date', filter.dateTo);

  const { data, error } = await metQuery.order('date', { ascending: false }).limit(10000);

  if (error) throw new ExportError(`Failed to fetch insights: ${error.message}`);
  return data ?? [];
}

/** Fetch audit log entries for export */
export async function fetchAuditLogForExport(
  workspaceId: string,
  filter?: { actionCategory?: string; dateFrom?: string; dateTo?: string }
): Promise<any[]> {
  let query = supabase
    .from('audit_log')
    .select('action, entity_type, entity_id, details, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (filter?.actionCategory) query = query.eq('action', filter.actionCategory);
  if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
  if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);

  const { data, error } = await query;

  if (error) throw new ExportError(`Failed to fetch audit log: ${error.message}`);
  return data ?? [];
}

/** Fetch a report's full data for export */
export async function fetchReportData(workspaceId: string, reportId: string): Promise<any> {
  const { data, error } = await supabase
    .from('report_results')
    .select('*')
    .eq('id', reportId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) throw new ExportError(`Report not found: ${error?.message || reportId}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Exporters
// ─────────────────────────────────────────────────────────────────────────────

/** Export campaigns to CSV string */
export async function exportCampaignsToCSV(
  campaigns: any[],
  options: CSVExportOptions = {}
): Promise<{ csv: string; filename: string }> {
  const columns = options.columns || [
    'id', 'name', 'platform', 'status', 'objective', 'budget',
    'spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa', 'roas', 'created_at'
  ];

  const headers = columns.map((col) => ({ id: col, title: col }));
  const records = campaigns.map((c) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      row[col] = c[col] ?? '';
    });
    return row;
  });

  // Use csv-writer with memory (write to temp, read back)
  const tmpDir = path.join('/tmp', `export-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, 'campaigns.csv');

  const csvWriter = createObjectCsvWriter({
    path: tmpPath,
    header: headers,
  });

  await csvWriter.writeRecords(records);
  const csv = await fs.readFile(tmpPath, 'utf-8');

  // Cleanup
  await fs.unlink(tmpPath).catch(() => {});
  await fs.rmdir(tmpDir).catch(() => {});

  const filename = `campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

/** Export insights/metrics to CSV string */
export async function exportInsightsToCSV(
  insights: any[],
  options: CSVExportOptions = {}
): Promise<{ csv: string; filename: string }> {
  const columns = options.columns || [
    'campaign_id', 'date', 'impressions', 'clicks', 'spend', 'conversions', 'conversion_value', 'reach'
  ];

  const headers = columns.map((col) => ({ id: col, title: col }));
  const records = insights.map((r) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      row[col] = r[col] ?? '';
    });
    return row;
  });

  const tmpDir = path.join('/tmp', `export-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, 'insights.csv');

  const csvWriter = createObjectCsvWriter({
    path: tmpPath,
    header: headers,
  });

  await csvWriter.writeRecords(records);
  const csv = await fs.readFile(tmpPath, 'utf-8');

  await fs.unlink(tmpPath).catch(() => {});
  await fs.rmdir(tmpDir).catch(() => {});

  const filename = `insights-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

/** Export audit log to CSV string */
export async function exportAuditLogToCSV(
  entries: any[],
  options: CSVExportOptions = {}
): Promise<{ csv: string; filename: string }> {
  const columns = options.columns || ['action', 'entity_type', 'entity_id', 'details', 'created_at'];

  const headers = columns.map((col) => ({ id: col, title: col }));
  const records = entries.map((e) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      row[col] = e[col] ?? '';
    });
    return row;
  });

  const tmpDir = path.join('/tmp', `export-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, 'audit.csv');

  const csvWriter = createObjectCsvWriter({
    path: tmpPath,
    header: headers,
  });

  await csvWriter.writeRecords(records);
  const csv = await fs.readFile(tmpPath, 'utf-8');

  await fs.unlink(tmpPath).catch(() => {});
  await fs.rmdir(tmpDir).catch(() => {});

  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel Exporters
// ─────────────────────────────────────────────────────────────────────────────

/** Export campaigns to Excel buffer */
export async function exportCampaignsToExcel(
  campaigns: any[],
  _options: ExcelExportOptions = {}
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Campaigns');

  // Main campaigns sheet
  const campaignData = campaigns.map((c) => ({
    ID: c.id,
    Name: c.name,
    Platform: c.platform,
    Status: c.status,
    Objective: c.objective,
    Budget: c.budget,
    Spend: c.spend,
    Impressions: c.impressions,
    Clicks: c.clicks,
    CTR: c.ctr,
    Conversions: c.conversions,
    CPA: c.cpa,
    ROAS: c.roas,
    'Created At': c.created_at,
  }));

  if (campaignData.length > 0) {
    const keys = Object.keys(campaignData[0]);
    ws.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(
        Math.max(key.length, ...campaignData.map((r) => String(r[key as keyof typeof r] ?? '').length)) + 3,
        50
      ),
    }));
    campaignData.forEach((row) => ws.addRow(row));
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `campaigns-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer: Buffer.from(buffer), filename };
}

/** Export report data to Excel buffer with multiple sheets */
export async function exportReportToExcel(
  reportData: any,
  _options: ExcelExportOptions = {}
): Promise<{ buffer: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  const content = reportData.content || reportData;

  // ── Sheet 1: Summary ──
  const summaryRows: any[] = [];
  if (content.summary) {
    Object.entries(content.summary).forEach(([key, value]) => {
      summaryRows.push({ Metric: key, Value: typeof value === 'number' ? Number(value.toFixed(2)) : value });
    });
  }
  if (summaryRows.length > 0) {
    const summaryWs = wb.addWorksheet('Summary');
    summaryWs.columns = [
      { header: 'Metric', key: 'Metric', width: 25 },
      { header: 'Value', key: 'Value', width: 30 },
    ];
    summaryRows.forEach((row) => summaryWs.addRow(row));
  }

  const rowKeys = (rows: Array<Record<string, unknown>>): string[] => Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  // ── Sheet 2: Campaigns ──
  const campaigns = content.campaigns || content.data?.campaigns || [];
  if (campaigns.length > 0) {
    const campWs = wb.addWorksheet('Campaigns');
    const keys = rowKeys(campaigns);
    campWs.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(key.length, ...campaigns.map((r: any) => String(r[key] ?? '').length)) + 2, 50),
    }));
    campaigns.forEach((row: any) => campWs.addRow(row));
  }

  // ── Sheet 3: Creatives ──
  const creatives = content.creatives || content.data?.creatives || [];
  if (creatives.length > 0) {
    const creativeWs = wb.addWorksheet('Creatives');
    const keys = rowKeys(creatives);
    creativeWs.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(key.length, ...creatives.map((r: any) => String(r[key] ?? '').length)) + 2, 50),
    }));
    creatives.forEach((row: any) => creativeWs.addRow(row));
  }

  // ── Sheet 4: Daily Trend ──
  const trend = content.dailyTrend || content.data?.dailyTrend || [];
  if (trend.length > 0) {
    const trendWs = wb.addWorksheet('Daily Trend');
    const keys = rowKeys(trend);
    trendWs.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(key.length, ...trend.map((r: any) => String(r[key] ?? '').length)) + 2, 40),
    }));
    trend.forEach((row: any) => trendWs.addRow(row));
  }

  // ── Sheet 5: Metadata ──
  const metaRows = [
    { Field: 'Report ID', Value: reportData.id || '' },
    { Field: 'Type', Value: content.type || reportData.type || '' },
    { Field: 'Name', Value: content.name || reportData.name || '' },
    { Field: 'Generated At', Value: reportData.created_at || new Date().toISOString() },
    { Field: 'Status', Value: reportData.status || 'completed' },
    { Field: 'Platforms', Value: content.platforms?.join?.(', ') || '' },
    { Field: 'Date Range', Value: content.date_range ? `${content.date_range.start} to ${content.date_range.end}` : '' },
  ];
  const metaWs = wb.addWorksheet('Metadata');
  metaWs.columns = [
    { header: 'Field', key: 'Field', width: 20 },
    { header: 'Value', key: 'Value', width: 50 },
  ];
  metaRows.forEach((row) => metaWs.addRow(row));

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `report-${reportData.id || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer: Buffer.from(buffer), filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF / HTML Exporter
// ─────────────────────────────────────────────────────────────────────────────

/** Export report data to printable HTML (browser → PDF via print dialog) */
export async function exportReportToPDF(
  reportData: any,
  options: PDFExportOptions = {}
): Promise<{ buffer: string; filename: string }> {
  const content = reportData.content || reportData;
  const title = options.title || content.name || `Report ${reportData.id || ''}`;
  const campaigns = content.campaigns || content.data?.campaigns || [];
  const summary = content.summary || {};

  // Build summary HTML rows
  let summaryHtml = '';
  if (summary && Object.keys(summary).length > 0) {
    summaryHtml = Object.entries(summary)
      .map(
        ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-variant-numeric:tabular-nums;">${typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}</td>
      </tr>`
      )
      .join('');
  }

  // Build campaign table rows
  let campaignHeaders = '';
  let campaignRows = '';
  if (campaigns.length > 0) {
    const keys = Object.keys(campaigns[0]).filter((k) => k !== 'id');
    campaignHeaders = keys.map((k) => `<th style="padding:8px 10px;border-bottom:2px solid #d1d5db;background:#f3f4f6;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.3px;">${k.replace(/_/g, ' ')}</th>`).join('');
    campaignRows = campaigns
      .map((c: any) => {
        const cells = keys
          .map((k) => {
            const val = c[k];
            const isNum = typeof val === 'number';
            return `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:10px;${isNum ? 'text-align:right;font-variant-numeric:tabular-nums;' : ''}">${isNum ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (val ?? '')}</td>`;
          })
          .join('');
        return `<tr style="page-break-inside:avoid;">${cells}</tr>`;
      })
      .join('');
  }

  const dateRange = content.date_range
    ? `${content.date_range.start} to ${content.date_range.end}`
    : (options.dateRange ? `${options.dateRange.start} to ${options.dateRange.end}` : 'All time');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .subtitle { color: #6b7280; font-size: 10px; margin-bottom: 16px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 10px; text-align: left; }
    th { background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
    td { border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .summary-table { max-width: 500px; }
    .summary-table td:last-child { text-align: right; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      tr { page-break-inside: avoid; }
      h1 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">
    Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp;
    Period: ${dateRange} &nbsp;|&nbsp;
    Campaigns: ${campaigns.length.toLocaleString()} row${campaigns.length !== 1 ? 's' : ''}
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <table class="summary-table">
      <tbody>${summaryHtml}</tbody>
    </table>
  </div>

  ${campaigns.length > 0 ? `
  <div class="section">
    <div class="section-title">Campaign Details</div>
    <table>
      <thead><tr>${campaignHeaders}</tr></thead>
      <tbody>${campaignRows}</tbody>
    </table>
  </div>
  ` : ''}
</body>
</html>`;

  const filename = `report-${reportData.id || 'export'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { buffer: html, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming CSV Export
// ─────────────────────────────────────────────────────────────────────────────

/** Stream campaigns directly to response as CSV (for large datasets) */
export async function streamCampaignsToCSV(
  workspaceId: string,
  filter: CampaignFilter,
  res: any
): Promise<void> {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="campaigns-stream-${Date.now()}.csv"`);

  // Write headers
  const headers = ['id', 'name', 'platform', 'status', 'objective', 'budget', 'spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa', 'roas', 'created_at'];
  res.write(headers.join(',') + '\n');

  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('campaigns')
      .select(headers.join(','))
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter.platform) query = query.eq('platform', filter.platform);
    if (filter.status) query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) throw new ExportError(`Stream error: ${error.message}`);

    const rows = data ?? [];
    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      const line = headers.map((h) => {
        const val = (row as unknown as Record<string, unknown>)[h as string] as string | number | boolean | null | undefined;
        if (val == null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',');
      res.write(line + '\n');
    }

    offset += limit;
    hasMore = rows.length === limit;
  }

  res.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Job Queue (in-memory for MVP)
// ─────────────────────────────────────────────────────────────────────────────

interface ExportJob {
  jobId: string;
  workspaceId: string;
  userId: string;
  type: string;
  format: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  filter: CampaignFilter;
  url?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobStore = new Map<string, ExportJob>();

/** Queue an export job */
export async function queueExportJob(
  workspaceId: string,
  userId: string,
  type: string,
  format: string,
  filter: CampaignFilter
): Promise<{ jobId: string; status: string }> {
  const jobId = `exp_${uuidv4().replace(/-/g, '')}`;
  const job: ExportJob = {
    jobId,
    workspaceId,
    userId,
    type,
    format,
    status: 'queued',
    filter,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobStore.set(jobId, job);

  // Process immediately for now (background worker can be added later)
  setTimeout(() => processExportJob(jobId), 100);

  return { jobId, status: 'queued' };
}

/** Get export job status */
export async function getExportJobStatus(
  jobId: string
): Promise<{ status: string; url?: string; error?: string }> {
  const job = jobStore.get(jobId);
  if (!job) return { status: 'not_found', error: 'Job not found' };

  // Cleanup old completed jobs
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, j] of jobStore) {
    if (j.status === 'completed' && j.updatedAt.getTime() < oneHourAgo) {
      jobStore.delete(id);
    }
  }

  return { status: job.status, url: job.url, error: job.error };
}

/** Process an export job */
async function processExportJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.updatedAt = new Date();

  try {
    let _result: { csv?: string; buffer?: Buffer } = {};

    if (job.type === 'campaigns') {
      if (job.format === 'csv' || job.format === 'excel') {
        const campaigns = await fetchCampaignsForExport(job.workspaceId, job.filter);
        if (job.format === 'csv') {
          _result = await exportCampaignsToCSV(campaigns);
        } else {
          _result = await exportCampaignsToExcel(campaigns);
        }
      }
    } else if (job.type === 'insights') {
      const insights = await fetchInsightsForExport(job.workspaceId, job.filter);
      _result = await exportInsightsToCSV(insights);
    }

    job.status = 'completed';
    job.url = `/api/v1/exports/jobs/${jobId}/download`;
    job.updatedAt = new Date();
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.updatedAt = new Date();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy ExportService Class (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/** Service for exporting reports to CSV and Excel formats */
export class ExportService {
  private tempManager: TempFileManager;

  constructor(tempManager: TempFileManager) {
    this.tempManager = tempManager;
  }

  /**
   * Export a report to the specified format
   */
  async exportReport(report: ReportResult, format: ExportFormat): Promise<ExportResult> {
    switch (format) {
      case 'csv':
        return this.exportToCsv(report);
      case 'xlsx':
        return this.exportToXlsx(report);
      default:
        throw new ExportError(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export report data to CSV format
   */
  private async exportToCsv(report: ReportResult): Promise<ExportResult> {
    const filePath = this.tempManager.createTempPath(`report-${report.reportId}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'platformName', title: 'Platform' },
        { id: 'impressions', title: 'Impressions' },
        { id: 'clicks', title: 'Clicks' },
        { id: 'ctr', title: 'CTR' },
        { id: 'spend', title: 'Spend ($)' },
        { id: 'cpc', title: 'CPC ($)' },
        { id: 'conversions', title: 'Conversions' },
      ],
    });

    const records = report.summary.platformBreakdown.map((row) => ({
      platformName: row.platformName,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: (row.ctr * 100).toFixed(2) + '%',
      spend: row.spend.toFixed(2),
      cpc: row.cpc.toFixed(2),
      conversions: row.conversions,
    }));

    await csvWriter.writeRecords(records);
    this.tempManager.trackFile(filePath);

    const fileSize = await this.tempManager.getFileSize(filePath);

    return {
      reportId: report.reportId,
      format: 'csv',
      filePath,
      fileSize,
      generatedAt: new Date(),
    };
  }

  /**
   * Export report data to Excel (XLSX) format with multiple sheets
   */
  private async exportToXlsx(report: ReportResult): Promise<ExportResult> {
    const filePath = this.tempManager.createTempPath(`report-${report.reportId}.xlsx`);

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // --- Sheet 1: Summary ---
    const summaryWs = workbook.addWorksheet('Summary');
    summaryWs.addRows([
      ['AdNexus Report', report.name],
      ['Generated', report.generatedAt.toISOString()],
      ['Period Start', report.timeRange.start.toISOString()],
      ['Period End', report.timeRange.end.toISOString()],
      ['Platforms', report.platforms.join(', ')],
      [''],
      ['Metric', 'Value'],
      ['Total Impressions', report.summary.totalImpressions],
      ['Total Clicks', report.summary.totalClicks],
      ['Total Spend', report.summary.totalSpend],
      ['Total Conversions', report.summary.totalConversions],
      ['CTR', (report.summary.ctr * 100).toFixed(2) + '%'],
      ['CPC', report.summary.cpc.toFixed(2)],
      ['CPM', report.summary.cpm.toFixed(2)],
      ...(report.summary.roas !== undefined ? [['ROAS', report.summary.roas.toFixed(2)]] : []),
    ]);

    // --- Sheet 2: Platform Breakdown ---
    const breakdownWs = workbook.addWorksheet('Platform Breakdown');
    breakdownWs.addRow([
      'Platform',
      'Impressions',
      'Clicks',
      'CTR (%)',
      'Spend ($)',
      'CPC ($)',
      'Conversions',
    ]);
    report.summary.platformBreakdown.forEach((row) => {
      breakdownWs.addRow([
        row.platformName,
        row.impressions,
        row.clicks,
        (row.ctr * 100).toFixed(2),
        row.spend.toFixed(2),
        row.cpc.toFixed(2),
        row.conversions,
      ]);
    });

    // --- Sheet 3: Period-over-Period (if available) ---
    if (report.summary.periodOverPeriod) {
      const pop = report.summary.periodOverPeriod;
      const popWs = workbook.addWorksheet('Period Comparison');
      popWs.addRows([
        ['Metric', 'Change (%)'],
        ['Impressions', pop.impressionsChange.toFixed(2)],
        ['Clicks', pop.clicksChange.toFixed(2)],
        ['Spend', pop.spendChange.toFixed(2)],
        ['Conversions', pop.conversionsChange.toFixed(2)],
      ]);
    }

    // --- Sheet 4: Metadata ---
    const metaWs = workbook.addWorksheet('Metadata');
    metaWs.addRows([
      ['Field', 'Value'],
      ['Report ID', report.reportId],
      ['Name', report.name],
      ['Status', report.status],
      ['Generated At', report.generatedAt.toISOString()],
      ['Time Range', `${report.timeRange.start.toISOString()} to ${report.timeRange.end.toISOString()}`],
      ['Granularity', report.timeRange.granularity],
      ['Platforms', report.platforms.join(', ')],
      ['Errors', report.errors?.join('; ') || 'None'],
    ]);

    // Write workbook to file
    await workbook.xlsx.writeFile(filePath);
    this.tempManager.trackFile(filePath);

    const fileSize = await this.tempManager.getFileSize(filePath);

    return {
      reportId: report.reportId,
      format: 'xlsx',
      filePath,
      fileSize,
      generatedAt: new Date(),
    };
  }

  /**
   * Clean up export files (called by TempFileManager)
   */
  async cleanup(): Promise<void> {
    // TempFileManager handles file cleanup
  }
}

/** Error thrown when export fails */
export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}
