// ============================================================================
// PDF Generation Service
// Generates professional PDF reports from report data using Puppeteer
// ============================================================================

import puppeteer from 'puppeteer';
import { ReportResult, ChartImage, ReportSummary, PlatformBreakdown } from '../types/report';
import { tempFileManager } from '../utils/temp-file-manager';
type TempFileManager = typeof tempFileManager;

/** Service for generating PDF reports */
export class PdfService {
  private tempManager: TempFileManager;
  private browser: any = null;

  constructor(tempManager: TempFileManager) {
    this.tempManager = tempManager;
  }

  /**
   * Initialize the Puppeteer browser instance (lazy singleton)
   */
  private async getBrowser(): Promise<any> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Generate a PDF report from report data and chart images
   */
  async generatePdf(report: ReportResult, charts: ChartImage[]): Promise<string> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Build HTML content
      const htmlContent = this.buildReportHtml(report, charts);

      // Set page content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Wait for chart images to load
      await page.waitForSelector('.chart-image', { timeout: 30000 });

      // Generate PDF
      const pdfPath = this.tempManager.createTempPath('report.pdf');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '40px',
          right: '40px',
          bottom: '60px',
          left: '40px',
        },
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; padding: 0 40px; display: flex; justify-content: space-between;">
            <span>AdNexus Report</span>
            <span class="date"></span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; padding: 0 40px; display: flex; justify-content: space-between;">
            <span>Generated on ${new Date().toLocaleDateString()}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
        displayHeaderFooter: true,
      });

      this.tempManager.trackFile(pdfPath);
      return pdfPath;
    } finally {
      await page.close();
    }
  }

  /**
   * Build the HTML content for the PDF report
   */
  private buildReportHtml(report: ReportResult, charts: ChartImage[]): string {
    const summary = report.summary;
    const summaryHtml = this.buildSummaryHtml(summary);
    const chartsHtml = this.buildChartsHtml(charts);
    const breakdownHtml = this.buildBreakdownHtml(summary.platformBreakdown);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(report.name)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
            background: #fff;
          }
          .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #2563eb;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 28px;
            color: #1e293b;
            margin-bottom: 8px;
          }
          .header .subtitle {
            font-size: 14px;
            color: #64748b;
          }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section-title {
            font-size: 20px;
            color: #1e293b;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 20px;
          }
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .metric-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
          }
          .metric-change {
            font-size: 12px;
            margin-top: 4px;
          }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          .chart-container {
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .chart-container h3 {
            font-size: 16px;
            color: #475569;
            margin-bottom: 12px;
          }
          .chart-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-size: 12px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
          }
          td { font-size: 14px; }
          tr:hover { background: #f8fafc; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            .section { page-break-inside: avoid; }
            .chart-container { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.escapeHtml(report.name)}</h1>
          <div class="subtitle">
            Generated: ${report.generatedAt.toLocaleDateString()} | 
            Period: ${report.timeRange.start.toLocaleDateString()} - ${report.timeRange.end.toLocaleDateString()} |
            Platforms: ${report.platforms.join(', ')}
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Executive Summary</h2>
          ${summaryHtml}
        </div>

        ${charts.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Charts & Visualizations</h2>
          ${chartsHtml}
        </div>
        ` : ''}

        ${summary.platformBreakdown.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Platform Breakdown</h2>
          ${breakdownHtml}
        </div>
        ` : ''}

        <div class="footer">
          <p>This report was automatically generated by AdNexus. 
          ${report.errors && report.errors.length > 0 ? `<br>Warnings: ${report.errors.join('; ')}` : ''}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build summary metrics HTML
   */
  private buildSummaryHtml(summary: ReportSummary): string {
    const formatNumber = (n: number) =>
      n >= 1000000
        ? `${(n / 1000000).toFixed(2)}M`
        : n >= 1000
          ? `${(n / 1000).toFixed(2)}K`
          : n.toLocaleString();

    const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`;

    const pop = summary.periodOverPeriod;

    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Impressions</div>
          <div class="metric-value">${formatNumber(summary.totalImpressions)}</div>
          ${pop ? `<div class="metric-change ${pop.impressionsChange >= 0 ? 'positive' : 'negative'}">${pop.impressionsChange >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(pop.impressionsChange).toFixed(1)}%</div>` : ''}
        </div>
        <div class="metric-card">
          <div class="metric-label">Clicks</div>
          <div class="metric-value">${formatNumber(summary.totalClicks)}</div>
          ${pop ? `<div class="metric-change ${pop.clicksChange >= 0 ? 'positive' : 'negative'}">${pop.clicksChange >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(pop.clicksChange).toFixed(1)}%</div>` : ''}
        </div>
        <div class="metric-card">
          <div class="metric-label">Spend</div>
          <div class="metric-value">${formatCurrency(summary.totalSpend)}</div>
          ${pop ? `<div class="metric-change ${pop.spendChange >= 0 ? 'positive' : 'negative'}">${pop.spendChange >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(pop.spendChange).toFixed(1)}%</div>` : ''}
        </div>
        <div class="metric-card">
          <div class="metric-label">Conversions</div>
          <div class="metric-value">${formatNumber(summary.totalConversions)}</div>
          ${pop ? `<div class="metric-change ${pop.conversionsChange >= 0 ? 'positive' : 'negative'}">${pop.conversionsChange >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(pop.conversionsChange).toFixed(1)}%</div>` : ''}
        </div>
        <div class="metric-card">
          <div class="metric-label">CTR</div>
          <div class="metric-value">${formatPercent(summary.ctr)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">CPC</div>
          <div class="metric-value">${formatCurrency(summary.cpc)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">CPM</div>
          <div class="metric-value">${formatCurrency(summary.cpm)}</div>
        </div>
        ${summary.roas !== undefined ? `
        <div class="metric-card">
          <div class="metric-label">ROAS</div>
          <div class="metric-value">${summary.roas.toFixed(2)}x</div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Build charts section HTML
   */
  private buildChartsHtml(charts: ChartImage[]): string {
    return charts
      .map(
        chart => `
      <div class="chart-container">
        <h3>${this.escapeHtml(chart.title)}</h3>
        <img class="chart-image" src="file://${chart.imagePath}" alt="${this.escapeHtml(chart.title)}" />
      </div>
    `
      )
      .join('');
  }

  /**
   * Build platform breakdown table HTML
   */
  private buildBreakdownHtml(breakdown: PlatformBreakdown[]): string {
    const formatNumber = (n: number) =>
      n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(2)}K` : n.toLocaleString();

    const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`;

    return `
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>CTR</th>
            <th>Spend</th>
            <th>CPC</th>
            <th>Conv.</th>
          </tr>
        </thead>
        <tbody>
          ${breakdown
            .map(
              row => `
            <tr>
              <td><strong>${this.escapeHtml(row.platformName)}</strong></td>
              <td>${formatNumber(row.impressions)}</td>
              <td>${formatNumber(row.clicks)}</td>
              <td>${formatPercent(row.ctr)}</td>
              <td>${formatCurrency(row.spend)}</td>
              <td>${formatCurrency(row.cpc)}</td>
              <td>${formatNumber(row.conversions)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Close the Puppeteer browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
