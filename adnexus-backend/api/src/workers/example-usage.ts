// ============================================================================
// Example Usage: Report Generation Worker
// ============================================================================
// This file demonstrates how to use the ReportGenerationWorker in your
// application. It covers worker startup, queueing jobs, and handling results.
//
// Copy relevant sections into your application bootstrap or route handlers.
// ============================================================================

import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import {
  ReportGenerationWorker,
  createReportWorker,
  addScheduledReportJob,
  addOnDemandReportJob,
  addExportJob,
} from './generate-reports';
import { EmailConfig } from '../services/email-service';
import { ReportParams, ChartConfig } from '../types/report';

// ---------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const emailConfig: EmailConfig = {
  smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpSecure: false,
  smtpUser: process.env.SMTP_USER || 'apikey',
  smtpPass: process.env.SMTP_PASS,
  fromAddress: process.env.FROM_EMAIL || 'reports@adnexus.io',
  fromName: process.env.FROM_NAME || 'AdNexus Reports',
};

// ---------------------------------------------------------------------------
// 2. Start the Worker (run this in your worker process)
// ---------------------------------------------------------------------------

export async function startWorkerProcess(): Promise<ReportGenerationWorker> {
  const worker = await createReportWorker(
    REDIS_URL,
    {
      maxRetries: 3,
      retryDelayMs: 5000,
      concurrency: 2, // Process 2 reports concurrently
      chartWidth: 800,
      chartHeight: 400,
      tempDir: '/tmp/report-worker',
    },
    emailConfig
  );

  // Graceful shutdown on SIGTERM / SIGINT
  process.on('SIGTERM', () => worker.stop(30000));
  process.on('SIGINT', () => worker.stop(30000));

  console.log('Report worker process started');
  return worker;
}

// ---------------------------------------------------------------------------
// 3. Queue a Job from your API (run this in your web server process)
// ---------------------------------------------------------------------------

export async function queueScheduledReport(
  scheduleId: string,
  runAt?: Date
): Promise<string> {
  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const queue = new Queue('reports', { connection: redis });

  const job = await addScheduledReportJob(queue, scheduleId, runAt);

  await queue.close();
  await redis.quit();

  console.log(`Scheduled report job queued: ${job.id}`);
  return job.id || '';
}

export async function queueOnDemandReport(
  params: ReportParams
): Promise<string> {
  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const queue = new Queue('reports', { connection: redis });

  // High priority for on-demand reports
  const job = await addOnDemandReportJob(queue, params, 1);

  await queue.close();
  await redis.quit();

  console.log(`On-demand report job queued: ${job.id}`);
  return job.id || '';
}

export async function queueExportJob(
  reportId: string,
  format: 'pdf' | 'csv' | 'xlsx',
  emails?: string[]
): Promise<string> {
  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const queue = new Queue('reports', { connection: redis });

  const job = await addExportJob(queue, reportId, format, emails);

  await queue.close();
  await redis.quit();

  console.log(`Export job queued: ${job.id}`);
  return job.id || '';
}

// ---------------------------------------------------------------------------
// 4. Direct (non-queued) Report Generation (for testing or sync needs)
// ---------------------------------------------------------------------------

export async function generateReportDirectly(): Promise<void> {
  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const worker = new ReportGenerationWorker(redis, {}, emailConfig);

  const params: ReportParams = {
    name: 'Weekly Performance Report',
    description: 'Aggregated performance across all platforms',
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      end: new Date(),
      granularity: 'daily',
    },
    platforms: [
      {
        platformId: 'google_ads',
        platformName: 'Google Ads',
        credentials: {
          apiKey: process.env.GOOGLE_ADS_API_KEY,
          accountId: process.env.GOOGLE_ADS_ACCOUNT_ID,
        },
        metrics: ['impressions', 'clicks', 'spend', 'conversions'],
      },
      {
        platformId: 'meta_ads',
        platformName: 'Meta Ads',
        credentials: {
          accessToken: process.env.META_ACCESS_TOKEN,
          accountId: process.env.META_ACCOUNT_ID,
        },
        metrics: ['impressions', 'clicks', 'spend', 'conversions'],
      },
    ],
    charts: [
      {
        type: 'line',
        title: 'Daily Impressions Trend',
        data: { labels: [], datasets: [] },
      },
      {
        type: 'bar',
        title: 'Platform Spend Comparison',
        data: { labels: [], datasets: [] },
      },
      {
        type: 'doughnut',
        title: 'Click Distribution',
        data: { labels: [], datasets: [] },
      },
    ],
    emailRecipients: ['team@example.com'],
  };

  try {
    const result = await worker.generateOnDemandReport(params);
    console.log('Report generated:', {
      reportId: result.reportId,
      status: result.status,
      chartsGenerated: result.charts.length,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Report generation failed:', error);
  } finally {
    await worker.stop();
  }
}

// ---------------------------------------------------------------------------
// 5. Express Route Handler Example
// ---------------------------------------------------------------------------

/*
import { Router } from 'express';

const reportRouter = Router();

// POST /api/reports/on-demand - Queue an on-demand report
reportRouter.post('/on-demand', async (req, res) => {
  try {
    const params: ReportParams = req.body;
    const jobId = await queueOnDemandReport(params);
    res.status(202).json({ jobId, status: 'queued' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/reports/:id/export - Export an existing report
reportRouter.post('/:id/export', async (req, res) => {
  try {
    const { format, emails } = req.body;
    const jobId = await queueExportJob(req.params.id, format, emails);
    res.status(202).json({ jobId, status: 'queued' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default reportRouter;
*/

// ---------------------------------------------------------------------------
// Main (for running directly)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'worker':
      startWorkerProcess().catch(console.error);
      break;
    case 'direct':
      generateReportDirectly().catch(console.error);
      break;
    default:
      console.log(`
Usage: ts-node example-usage.ts <command>

Commands:
  worker  - Start the worker process
  direct  - Generate a report directly (no queue)

Examples:
  ts-node example-usage.ts worker
  ts-node example-usage.ts direct
`);
      process.exit(1);
  }
}
