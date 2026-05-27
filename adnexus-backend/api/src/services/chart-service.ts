// ============================================================================
// Chart Generation Service
// Renders Chart.js charts to PNG images using node-canvas
// ============================================================================

import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { createCanvas } from 'canvas';
import { ChartConfig, ChartImage, ChartOptions } from '../types/report';
import { TempFileManager } from '../utils/temp-file-manager';

// Register all Chart.js components
Chart.register(...registerables);

/** Service for generating chart images from Chart.js configurations */
export class ChartService {
  private tempManager: TempFileManager;
  private defaultWidth: number;
  private defaultHeight: number;

  constructor(tempManager: TempFileManager, width = 800, height = 400) {
    this.tempManager = tempManager;
    this.defaultWidth = width;
    this.defaultHeight = height;
  }

  /**
   * Render a single chart configuration to a PNG image file
   */
  async renderChart(config: ChartConfig, jobId?: string): Promise<ChartImage> {
    const width = config.width || this.defaultWidth;
    const height = config.height || this.defaultHeight;

    // Create canvas with proper dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Build Chart.js configuration
    const chartConfig = this.buildChartConfig(config, ctx);

    // Create and render chart
    const chart = new Chart(ctx, chartConfig);

    // Export to PNG buffer
    const buffer = canvas.toBuffer('image/png');
    chart.destroy();

    // Save to temp file
    const imagePath = this.tempManager.createTempPath(
      `chart-${config.type}`,
      '.png'
    );
    const fs = await import('fs').then(m => m.promises);
    await fs.writeFile(imagePath, buffer);
    this.tempManager.trackFile(imagePath);

    return {
      chartId: `${config.type}-${Date.now()}`,
      title: config.title,
      type: config.type,
      imagePath,
      width,
      height,
    };
  }

  /**
   * Render multiple charts in parallel
   */
  async renderCharts(configs: ChartConfig[], jobId?: string): Promise<ChartImage[]> {
    const promises = configs.map((config, index) =>
      this.renderChart(config, jobId).catch(error => {
        console.error(`[ChartService] Failed to render chart "${config.title}":`, error);
        throw new ChartRenderError(`Chart "${config.title}" failed: ${(error as Error).message}`);
      })
    );

    const results = await Promise.allSettled(promises);
    const charts: ChartImage[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        charts.push(result.value);
      } else {
        errors.push(result.reason?.message || `Chart ${index} failed`);
      }
    });

    if (charts.length === 0 && errors.length > 0) {
      throw new ChartRenderError(`All chart renders failed: ${errors.join('; ')}`);
    }

    return charts;
  }

  /**
   * Build a Chart.js configuration from our ChartConfig type
   */
  private buildChartConfig(
    config: ChartConfig,
    ctx: CanvasRenderingContext2D
  ): ChartConfiguration {
    const colors = this.generateColorPalette(config.data.datasets.length);

    const datasets = config.data.datasets.map((ds, index) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor || colors[index].background,
      borderColor: ds.borderColor || colors[index].border,
      borderWidth: ds.borderWidth || 2,
      fill: ds.fill ?? config.type === 'area',
      tension: config.type === 'line' || config.type === 'area' ? 0.3 : 0,
    }));

    const chartType = this.mapChartType(config.type);

    const options: ChartOptions = {
      responsive: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
        },
        title: {
          display: true,
          text: config.title,
        },
      },
      ...config.options,
    };

    // Add scales for cartesian charts
    if (['bar', 'line', 'area', 'stacked-bar'].includes(config.type)) {
      (options as Record<string, unknown>).scales = {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45 },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f0f0f0' },
        },
      };

      if (config.type === 'stacked-bar') {
        ((options as Record<string, unknown>).scales as Record<string, unknown>).x = {
          stacked: true,
          grid: { display: false },
        };
        ((options as Record<string, unknown>).scales as Record<string, unknown>).y = {
          stacked: true,
          beginAtZero: true,
          grid: { color: '#f0f0f0' },
        };
      }
    }

    return {
      type: chartType,
      data: {
        labels: config.data.labels,
        datasets,
      },
      options: options as ChartConfiguration['options'],
    };
  }

  /**
   * Map our chart type names to Chart.js types
   */
  private mapChartType(type: ChartConfig['type']): ChartType {
    switch (type) {
      case 'area':
        return 'line';
      case 'stacked-bar':
        return 'bar';
      default:
        return type as ChartType;
    }
  }

  /**
   * Generate a color palette for chart datasets
   */
  private generateColorPalette(count: number): Array<{ background: string; border: string }> {
    const baseColors = [
      { background: 'rgba(54, 162, 235, 0.6)', border: 'rgba(54, 162, 235, 1)' },
      { background: 'rgba(255, 99, 132, 0.6)', border: 'rgba(255, 99, 132, 1)' },
      { background: 'rgba(75, 192, 192, 0.6)', border: 'rgba(75, 192, 192, 1)' },
      { background: 'rgba(255, 206, 86, 0.6)', border: 'rgba(255, 206, 86, 1)' },
      { background: 'rgba(153, 102, 255, 0.6)', border: 'rgba(153, 102, 255, 1)' },
      { background: 'rgba(255, 159, 64, 0.6)', border: 'rgba(255, 159, 64, 1)' },
      { background: 'rgba(199, 199, 199, 0.6)', border: 'rgba(199, 199, 199, 1)' },
      { background: 'rgba(83, 102, 255, 0.6)', border: 'rgba(83, 102, 255, 1)' },
      { background: 'rgba(40, 159, 64, 0.6)', border: 'rgba(40, 159, 64, 1)' },
      { background: 'rgba(215, 99, 132, 0.6)', border: 'rgba(215, 99, 132, 1)' },
    ];

    const palette: Array<{ background: string; border: string }> = [];
    for (let i = 0; i < count; i++) {
      palette.push(baseColors[i % baseColors.length]);
    }
    return palette;
  }
}

/** Error thrown when chart rendering fails */
export class ChartRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChartRenderError';
  }
}
