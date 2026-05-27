// ============================================================================
// Data Aggregation Service
// Fetches and aggregates metrics from multiple advertising platforms
// ============================================================================

import {
  PlatformSource,
  TimeRange,
  PlatformMetrics,
  MetricRow,
  ReportSummary,
  PlatformBreakdown,
  PeriodComparison,
} from '../types/report';

/** Platform API client interface */
interface PlatformApiClient {
  fetchMetrics(source: PlatformSource, timeRange: TimeRange): Promise<MetricRow[]>;
  validateCredentials(source: PlatformSource): Promise<boolean>;
  getPlatformName(): string;
}

/** Service for aggregating data from multiple advertising platforms */
export class DataAggregationService {
  private clients: Map<string, PlatformApiClient> = new Map();

  /**
   * Register a platform API client
   */
  registerClient(platformId: string, client: PlatformApiClient): void {
    this.clients.set(platformId, client);
  }

  /**
   * Fetch metrics from all configured platforms
   */
  async fetchAllPlatformMetrics(
    sources: PlatformSource[],
    timeRange: TimeRange,
    onProgress?: (platformId: string, status: 'fetching' | 'completed' | 'failed', error?: string) => void
  ): Promise<PlatformMetrics[]> {
    const results: PlatformMetrics[] = [];
    const errors: string[] = [];

    for (const source of sources) {
      try {
        onProgress?.(source.platformId, 'fetching');

        const client = this.clients.get(source.platformId);
        if (!client) {
          throw new Error(`No API client registered for platform: ${source.platformId}`);
        }

        // Validate credentials before fetching
        const valid = await client.validateCredentials(source);
        if (!valid) {
          throw new Error(`Invalid credentials for platform: ${source.platformName}`);
        }

        // Fetch metrics from platform
        const metrics = await client.fetchMetrics(source, timeRange);

        results.push({
          platformId: source.platformId,
          platformName: source.platformName,
          fetchedAt: new Date(),
          metrics,
        });

        onProgress?.(source.platformId, 'completed');
      } catch (error) {
        const errorMessage = `Failed to fetch from ${source.platformName}: ${(error as Error).message}`;
        console.error(`[DataAggregationService] ${errorMessage}`);
        errors.push(errorMessage);
        onProgress?.(source.platformId, 'failed', errorMessage);

        // Continue with other platforms - partial data is acceptable
        results.push({
          platformId: source.platformId,
          platformName: source.platformName,
          fetchedAt: new Date(),
          metrics: [],
        });
      }
    }

    return results;
  }

  /**
   * Compute report summary from aggregated platform metrics
   */
  computeReportSummary(
    platformMetrics: PlatformMetrics[],
    previousPeriodMetrics?: PlatformMetrics[]
  ): ReportSummary {
    const breakdown: PlatformBreakdown[] = platformMetrics.map(pm => {
      const impressions = this.sumMetric(pm.metrics, 'impressions');
      const clicks = this.sumMetric(pm.metrics, 'clicks');
      const spend = this.sumMetric(pm.metrics, 'spend');
      const conversions = this.sumMetric(pm.metrics, 'conversions');

      return {
        platformId: pm.platformId,
        platformName: pm.platformName,
        impressions,
        clicks,
        spend,
        conversions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
      };
    });

    const totalImpressions = breakdown.reduce((sum, b) => sum + b.impressions, 0);
    const totalClicks = breakdown.reduce((sum, b) => sum + b.clicks, 0);
    const totalSpend = breakdown.reduce((sum, b) => sum + b.spend, 0);
    const totalConversions = breakdown.reduce((sum, b) => sum + b.conversions, 0);

    // Compute period-over-period comparison if previous period data available
    let periodOverPeriod: PeriodComparison | undefined;
    if (previousPeriodMetrics) {
      const prevBreakdown = previousPeriodMetrics.map(pm => ({
        impressions: this.sumMetric(pm.metrics, 'impressions'),
        clicks: this.sumMetric(pm.metrics, 'clicks'),
        spend: this.sumMetric(pm.metrics, 'spend'),
        conversions: this.sumMetric(pm.metrics, 'conversions'),
      }));

      const prevImpressions = prevBreakdown.reduce((s, b) => s + b.impressions, 0);
      const prevClicks = prevBreakdown.reduce((s, b) => s + b.clicks, 0);
      const prevSpend = prevBreakdown.reduce((s, b) => s + b.spend, 0);
      const prevConversions = prevBreakdown.reduce((s, b) => s + b.conversions, 0);

      periodOverPeriod = {
        impressionsChange: prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 : 0,
        clicksChange: prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks) * 100 : 0,
        spendChange: prevSpend > 0 ? ((totalSpend - prevSpend) / prevSpend) * 100 : 0,
        conversionsChange: prevConversions > 0 ? ((totalConversions - prevConversions) / prevConversions) * 100 : 0,
      };
    }

    return {
      totalImpressions,
      totalClicks,
      totalSpend,
      totalConversions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      roas: totalSpend > 0 ? undefined : undefined, // ROAS requires revenue data
      platformBreakdown: breakdown,
      periodOverPeriod,
    };
  }

  /**
   * Sum a specific metric across all rows
   */
  private sumMetric(metrics: MetricRow[], metricName: string): number {
    return metrics
      .filter(m => m.metricName === metricName)
      .reduce((sum, m) => sum + m.value, 0);
  }

  /**
   * Get aggregated time-series data for charting
   */
  getTimeSeriesData(
    platformMetrics: PlatformMetrics[],
    metricName: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): { labels: string[]; values: number[] } {
    // Group metrics by timestamp bucket
    const bucketed = new Map<string, number>();

    for (const pm of platformMetrics) {
      for (const metric of pm.metrics) {
        if (metric.metricName === metricName) {
          const key = this.formatTimestamp(metric.timestamp, granularity);
          bucketed.set(key, (bucketed.get(key) || 0) + metric.value);
        }
      }
    }

    // Sort by timestamp
    const sorted = Array.from(bucketed.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return {
      labels: sorted.map(s => s[0]),
      values: sorted.map(s => s[1]),
    };
  }

  /**
   * Format a timestamp according to granularity
   */
  private formatTimestamp(
    timestamp: Date,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): string {
    const d = new Date(timestamp);
    switch (granularity) {
      case 'hourly':
        return `${d.toISOString().slice(0, 13)}:00`;
      case 'daily':
        return d.toISOString().slice(0, 10);
      case 'weekly':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'monthly':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }
}

/** Error thrown when data aggregation fails */
export class AggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AggregationError';
  }
}
