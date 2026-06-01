// ============================================
// Export Routes — CSV, Excel, PDF, Streaming, Job Queue
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import {
  exportCampaignsToCSV,
  exportInsightsToCSV,
  exportAuditLogToCSV,
  exportCampaignsToExcel,
  exportReportToExcel,
  exportReportToPDF,
  streamCampaignsToCSV,
  queueExportJob,
  getExportJobStatus,
  fetchCampaignsForExport,
  fetchInsightsForExport,
  fetchAuditLogForExport,
  fetchReportData,
} from '../services/export-service';
import type { CampaignFilter, Platform } from '../services/export-service';

const router = Router();

// ─── Query Param Helpers ───────────────────────────────────

function parseCampaignFilter(req: { query: Record<string, unknown> }): CampaignFilter {
  const filter: CampaignFilter = {};
  if (req.query.platform) filter.platform = String(req.query.platform) as Platform;
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.date_from) filter.dateFrom = String(req.query.date_from);
  if (req.query.date_to) filter.dateTo = String(req.query.date_to);
  if (req.query.search) filter.search = String(req.query.search);
  if (req.query.campaign_ids) {
    filter.campaignIds = String(req.query.campaign_ids).split(',').filter(Boolean);
  }
  return filter;
}

// ─── GET /api/v1/exports/campaigns.csv ─────────────────────

router.get(
  '/campaigns.csv',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const filter = parseCampaignFilter(req);

    const columns = req.query.columns
      ? String(req.query.columns).split(',').filter(Boolean)
      : undefined;

    const campaigns = await fetchCampaignsForExport(workspaceId, filter);
    const { csv, filename } = await exportCampaignsToCSV(campaigns, {
      columns,
      includeInsights: req.query.include_insights === 'true',
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ─── GET /api/v1/exports/campaigns.xlsx ────────────────────

router.get(
  '/campaigns.xlsx',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const filter = parseCampaignFilter(req);

    const campaigns = await fetchCampaignsForExport(workspaceId, filter);
    const includeAdsets = req.query.include_adsets === 'true';
    const includeAds = req.query.include_ads === 'true';

    const { buffer, filename } = await exportCampaignsToExcel(campaigns, {
      includeAdsets,
      includeAds,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

// ─── GET /api/v1/exports/campaigns/stream.csv ──────────────
// Streaming export for large datasets (1000+ campaigns)

router.get(
  '/campaigns/stream.csv',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const filter = parseCampaignFilter(req);

    await streamCampaignsToCSV(workspaceId, filter, res);
  }),
);

// ─── GET /api/v1/exports/insights.csv ──────────────────────

router.get(
  '/insights.csv',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const filter = parseCampaignFilter(req);

    const columns = req.query.columns
      ? String(req.query.columns).split(',').filter(Boolean)
      : undefined;

    const granularity = req.query.granularity as 'daily' | 'weekly' | 'monthly' | undefined;

    const insights = await fetchInsightsForExport(workspaceId, filter);
    const { csv, filename } = await exportInsightsToCSV(insights, {
      columns,
      granularity,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ─── GET /api/v1/exports/audit.csv ─────────────────────────

router.get(
  '/audit.csv',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const filter = {
      actionCategory: req.query.action_category ? String(req.query.action_category) : undefined,
      dateFrom: req.query.date_from ? String(req.query.date_from) : undefined,
      dateTo: req.query.date_to ? String(req.query.date_to) : undefined,
    };

    const columns = req.query.columns
      ? String(req.query.columns).split(',').filter(Boolean)
      : undefined;

    const entries = await fetchAuditLogForExport(
      workspaceId,
      filter.actionCategory || filter.dateFrom || filter.dateTo ? filter : undefined,
    );

    const { csv, filename } = await exportAuditLogToCSV(entries, { columns });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ─── GET /api/v1/exports/reports/:reportId.pdf ─────────────

router.get(
  '/reports/:reportId.pdf',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const reportId = req.params.reportId;

    const reportData = await fetchReportData(workspaceId, reportId);
    const { buffer, filename } = await exportReportToPDF(reportData, {
      title: req.query.title as string | undefined,
      dateRange: req.query.date_from && req.query.date_to
        ? {
            start: String(req.query.date_from),
            end: String(req.query.date_to),
          }
        : undefined,
    });

    // Serve as HTML (PDF source) — browser can print-to-PDF
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

// ─── GET /api/v1/exports/reports/:reportId.xlsx ────────────

router.get(
  '/reports/:reportId.xlsx',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const reportId = req.params.reportId;

    const reportData = await fetchReportData(workspaceId, reportId);
    const { buffer, filename } = await exportReportToExcel(reportData, {
      template: req.query.template as string | undefined,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

// ─── POST /api/v1/exports/queue ────────────────────────────

router.post(
  '/queue',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user!.sub;

    const schema = z.object({
      type: z.string().min(1),
      format: z.enum(['csv', 'excel', 'pdf']),
      filter: z
        .object({
          platform: z.string().optional(),
          status: z.string().optional(),
          date_from: z.string().optional(),
          date_to: z.string().optional(),
          campaign_ids: z.array(z.string()).optional(),
          search: z.string().optional(),
        })
        .optional(),
    });

    const body = schema.parse(req.body);

    const filter: CampaignFilter = {};
    if (body.filter?.platform) filter.platform = body.filter.platform as Platform;
    if (body.filter?.status) filter.status = body.filter.status;
    if (body.filter?.date_from) filter.dateFrom = body.filter.date_from;
    if (body.filter?.date_to) filter.dateTo = body.filter.date_to;
    if (body.filter?.campaign_ids) filter.campaignIds = body.filter.campaign_ids;
    if (body.filter?.search) filter.search = body.filter.search;

    const result = await queueExportJob(workspaceId, userId, body.type, body.format, filter);

    res.status(202).json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: 'Export job queued. Use GET /api/v1/exports/jobs/:jobId to check status.',
    });
  }),
);

// ─── GET /api/v1/exports/jobs/:jobId ───────────────────────

router.get(
  '/jobs/:jobId',
  asyncHandler(async (req, res) => {
    const status = await getExportJobStatus(req.params.jobId);

    res.json({
      success: true,
      status: status.status,
      downloadUrl: status.url,
      error: status.error,
    });
  }),
);

export default router;
