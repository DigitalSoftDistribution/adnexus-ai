import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

import {
  ExportService,
  exportCampaignsToExcel,
  exportReportToExcel,
} from './export-service';
import type { ReportResult } from '../types/report';

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

describe('Excel exports', () => {
  it('exports campaigns as a readable workbook', async () => {
    const { buffer, filename } = await exportCampaignsToExcel([
      {
        id: 'cmp-1',
        name: 'Launch Campaign',
        platform: 'meta',
        status: 'active',
        objective: 'conversions',
        budget: 500,
        spend: 125.5,
        impressions: 12000,
        clicks: 450,
        ctr: 0.0375,
        conversions: 32,
        cpa: 3.92,
        roas: 4.1,
        created_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const workbook = await loadWorkbook(buffer);
    const worksheet = workbook.getWorksheet('Campaigns');

    expect(filename).toMatch(/^campaigns-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(buffer.length).toBeGreaterThan(0);
    expect(worksheet?.getCell('A1').value).toBe('ID');
    expect(worksheet?.getCell('B2').value).toBe('Launch Campaign');
    expect(worksheet?.getCell('F2').value).toBe(500);
  });

  it('exports report data with expected workbook sheets', async () => {
    const { buffer } = await exportReportToExcel({
      id: 'rep-1',
      created_at: '2026-06-02T00:00:00.000Z',
      content: {
        type: 'performance',
        name: 'Weekly Performance',
        status: 'completed',
        platforms: ['meta', 'google'],
        date_range: { start: '2026-05-25', end: '2026-06-01' },
        summary: { spend: 400.456, roas: 3.891 },
        campaigns: [{ id: 'cmp-1', name: 'Launch Campaign' }],
        creatives: [{ id: 'creative-1', name: 'Hero Creative' }],
        dailyTrend: [{ date: '2026-06-01', spend: 100 }],
      },
    });

    const workbook = await loadWorkbook(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Summary',
      'Campaigns',
      'Creatives',
      'Daily Trend',
      'Metadata',
    ]);
    expect(workbook.getWorksheet('Summary')?.getCell('A1').value).toBe('Metric');
    expect(workbook.getWorksheet('Summary')?.getCell('A2').value).toBe('spend');
    expect(workbook.getWorksheet('Summary')?.getCell('B2').value).toBe(400.46);
    expect(workbook.getWorksheet('Summary')?.getCell('A3').value).toBe('roas');
    expect(workbook.getWorksheet('Summary')?.getCell('B3').value).toBe(3.89);
    expect(workbook.getWorksheet('Metadata')?.getCell('B2').value).toBe('rep-1');
  });

  it('writes legacy report XLSX exports to tracked temp files', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'adnexus-export-'));
    const tracked: string[] = [];
    const tempManager = {
      initialize: async () => {},
      create: async (_content: string, ext = '.tmp') => join(tempDir, `created${ext}`),
      createTempPath: (filename = 'export.tmp') => join(tempDir, filename),
      trackFile: (filePath: string) => {
        tracked.push(filePath);
      },
      getFileSize: async (filePath: string) => (await stat(filePath)).size,
      delete: async () => {},
      cleanup: async () => {},
    };

    const report: ReportResult = {
      reportId: 'report-1',
      name: 'Daily Report',
      status: 'completed',
      generatedAt: new Date('2026-06-01T08:00:00.000Z'),
      timeRange: {
        start: new Date('2026-05-31T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
        granularity: 'daily',
      },
      platforms: ['meta'],
      charts: [],
      summary: {
        totalImpressions: 1000,
        totalClicks: 50,
        totalSpend: 120,
        totalConversions: 8,
        ctr: 0.05,
        cpc: 2.4,
        cpm: 120,
        roas: 3.2,
        platformBreakdown: [
          {
            platformId: 'meta',
            platformName: 'Meta',
            impressions: 1000,
            clicks: 50,
            spend: 120,
            conversions: 8,
            ctr: 0.05,
            cpc: 2.4,
          },
        ],
        periodOverPeriod: {
          impressionsChange: 10,
          clicksChange: 5,
          spendChange: -2,
          conversionsChange: 12,
        },
      },
    };

    try {
      const result = await new ExportService(tempManager).exportReport(report, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await readFile(result.filePath)) as unknown as ArrayBuffer);

      expect(result.fileSize).toBeGreaterThan(0);
      expect(tracked).toEqual([result.filePath]);
      expect(workbook.getWorksheet('Summary')?.getCell('B1').value).toBe('Daily Report');
      expect(workbook.getWorksheet('Platform Breakdown')?.getCell('A2').value).toBe('Meta');
      expect(workbook.getWorksheet('Period Comparison')?.getCell('B2').value).toBe('10.00');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
