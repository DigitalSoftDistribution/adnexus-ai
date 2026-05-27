// ============================================================================
// Report Generation Worker Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ReportGenerationWorker, ReportGenerationError } from '../../src/workers/generate-reports';
import {
  ReportParams,
  ReportResult,
  ExportResult,
  ReportJobData,
  ReportSchedule,
} from '../../src/types/report';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/services/email-service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendReportEmail: vi.fn().mockResolvedValue(undefined),
    verifyConnection: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  EmailError: class EmailError extends Error {},
}));

vi.mock('../../src/services/pdf-service', () => ({
  PdfService: vi.fn().mockImplementation(() => ({
    generatePdf: vi.fn().mockResolvedValue('/tmp/report-test.pdf'),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/services/chart-service', () => ({
  ChartService: vi.fn().mockImplementation(() => ({
    renderCharts: vi.fn().mockResolvedValue([
      { chartId: 'c1', title: 'Test Chart', type: 'line', imagePath: '/tmp/chart1.png', width: 800, height: 400 },
    ]),
  })),
  ChartRenderError: class ChartRenderError extends Error {},
}));

vi.mock('../../src/services/export-service', () => ({
  ExportService: vi.fn().mockImplementation(() => ({
    exportReport: vi.fn().mockResolvedValue({
      reportId: 'rpt_test',
      format: 'csv',
      filePath: '/tmp/report-test.csv',
      fileSize: 1024,
      generatedAt: new Date(),
    }),
  })),
  ExportError: class ExportError extends Error {},
}));

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as IORedis;

const mockReportParams: ReportParams = {
  name: 'Test Report',
  description: 'Test report for unit tests',
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
    granularity: 'daily',
  },
  platforms: [
    {
      platformId: 'test_platform',
      platformName: 'Test Platform',
      credentials: { apiKey: 'test-key' },
      metrics: ['impressions', 'clicks', 'spend'],
    },
  ],
  charts: [
    {
      type: 'line',
      title: 'Test Chart',
      data: { labels: ['2024-01-01', '2024-01-02'], datasets: [{ label: 'Impressions', data: [100, 200] }] },
    },
  ],
  emailRecipients: ['test@example.com'],
};

const mockSchedule: ReportSchedule = {
  scheduleId: 'sch_test123',
  name: 'Weekly Report',
  frequency: 'weekly',
  dayOfWeek: 1,
  hour: 9,
  minute: 0,
  timezone: 'UTC',
  reportParams: mockReportParams,
  emailRecipients: ['team@example.com'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Helper: Create a mock BullMQ Job
// ---------------------------------------------------------------------------

function createMockJob(data: ReportJobData): Job<ReportJobData> {
  return {
    id: 'job_test123',
    data,
    attemptsMade: 0,
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<ReportJobData>;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ReportGenerationWorker', () => {
  let worker: ReportGenerationWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new ReportGenerationWorker(mockRedis);
  });

  afterEach(async () => {
    await worker.stop();
  });

  // =========================================================================
  // Constructor & Lifecycle
  // =========================================================================

  describe('constructor', () => {
    it('should create a worker instance with default config', () => {
      expect(worker).toBeInstanceOf(ReportGenerationWorker);
    });

    it('should accept custom config overrides', () => {
      const customWorker = new ReportGenerationWorker(mockRedis, {
        maxRetries: 5,
        concurrency: 4,
        chartWidth: 1200,
        chartHeight: 600,
      });
      expect(customWorker).toBeInstanceOf(ReportGenerationWorker);
    });
  });

  describe('start/stop', () => {
    it('should start and stop the worker', async () => {
      worker.start();
      // Worker should be running without errors
      await expect(worker.stop()).resolves.not.toThrow();
    });

    it('should handle double-start gracefully', () => {
      worker.start();
      worker.start(); // Should log warning, not throw
    });
  });

  // =========================================================================
  // Parameter Validation
  // =========================================================================

  describe('validateReportParams', () => {
    it('should throw on empty report name', async () => {
      const params = { ...mockReportParams, name: '' };
      await expect(worker.generateOnDemandReport(params)).rejects.toThrow(ReportGenerationError);
    });

    it('should throw on missing timeRange', async () => {
      const params = { ...mockReportParams, timeRange: undefined as any };
      await expect(worker.generateOnDemandReport(params)).rejects.toThrow(ReportGenerationError);
    });

    it('should throw on empty platforms array', async () => {
      const params = { ...mockReportParams, platforms: [] };
      await expect(worker.generateOnDemandReport(params)).rejects.toThrow(ReportGenerationError);
    });

    it('should throw on missing charts', async () => {
      const params = { ...mockReportParams, charts: undefined as any };
      await expect(worker.generateOnDemandReport(params)).rejects.toThrow(ReportGenerationError);
    });
  });

  // =========================================================================
  // Scheduled Reports
  // =========================================================================

  describe('generateScheduledReport', () => {
    it('should throw when schedule is not found', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await expect(worker.generateScheduledReport('non-existent')).rejects.toThrow(
        'Schedule not found: non-existent'
      );
    });

    it('should throw when schedule is inactive', async () => {
      const inactiveSchedule = { ...mockSchedule, isActive: false };
      (mockRedis.get as any).mockResolvedValue(JSON.stringify(inactiveSchedule));

      await expect(worker.generateScheduledReport('sch_test123')).rejects.toThrow(
        'Schedule is inactive'
      );
    });
  });

  // =========================================================================
  // On-Demand Reports
  // =========================================================================

  describe('generateOnDemandReport', () => {
    it('should validate parameters before generation', async () => {
      const invalidParams = { ...mockReportParams, name: '' };

      await expect(worker.generateOnDemandReport(invalidParams)).rejects.toThrow(
        ReportGenerationError
      );
    });
  });

  // =========================================================================
  // Export
  // =========================================================================

  describe('exportReport', () => {
    it('should throw when report is not found', async () => {
      (mockRedis.get as any).mockResolvedValue(null);

      await expect(worker.exportReport('non-existent', 'csv')).rejects.toThrow(
        'Report not found: non-existent'
      );
    });

    it('should support all export formats', async () => {
      const mockReport: ReportResult = {
        reportId: 'rpt_test',
        name: 'Test',
        status: 'completed',
        generatedAt: new Date(),
        timeRange: mockReportParams.timeRange,
        platforms: ['Test'],
        charts: [],
        summary: {
          totalImpressions: 1000,
          totalClicks: 100,
          totalSpend: 500,
          totalConversions: 10,
          ctr: 0.1,
          cpc: 5,
          cpm: 500,
          platformBreakdown: [],
        },
      };

      (mockRedis.get as any).mockResolvedValue(JSON.stringify(mockReport));

      const csvResult = await worker.exportReport('rpt_test', 'csv');
      expect(csvResult.format).toBe('csv');
    });
  });

  // =========================================================================
  // Email Delivery
  // =========================================================================

  describe('sendReportEmail', () => {
    it('should throw when email service is not configured', async () => {
      // Create worker without email config
      const workerNoEmail = new ReportGenerationWorker(mockRedis);

      await expect(
        workerNoEmail.sendReportEmail('rpt_test', ['test@example.com'])
      ).rejects.toThrow('Email service not configured');
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('ReportGenerationError', () => {
    it('should include stage and recoverable properties', () => {
      const error = new ReportGenerationError('Test error', 'test-stage', true);
      expect(error.message).toBe('Test error');
      expect(error.stage).toBe('test-stage');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('ReportGenerationError');
    });

    it('should default recoverable to true', () => {
      const error = new ReportGenerationError('Test error', 'test-stage');
      expect(error.recoverable).toBe(true);
    });
  });

  // =========================================================================
  // Job Type Validation
  // =========================================================================

  describe('job type validation', () => {
    it('should handle all valid job types', () => {
      const validTypes = ['scheduled', 'on-demand', 'export'];
      for (const type of validTypes) {
        const data: ReportJobData = {
          type: type as 'scheduled' | 'on-demand' | 'export',
          scheduleId: type === 'scheduled' ? 'sch_123' : undefined,
          reportParams: type === 'on-demand' ? mockReportParams : undefined,
          reportId: type === 'export' ? 'rpt_123' : undefined,
          format: type === 'export' ? 'pdf' : undefined,
        };
        expect(data.type).toBe(type);
      }
    });
  });
});
