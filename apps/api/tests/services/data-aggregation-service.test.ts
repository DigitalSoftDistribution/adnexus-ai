import { DataAggregationService } from '../../src/services/data-aggregation-service';
import type { PlatformMetrics } from '../../src/types/report';

describe('DataAggregationService.computeReportSummary', () => {
  const service = new DataAggregationService();

  const currentMetrics: PlatformMetrics[] = [
    {
      platformId: 'meta',
      platformName: 'Meta',
      fetchedAt: new Date('2026-06-01'),
      metrics: [
        { metricName: 'impressions', value: 2000, timestamp: new Date() },
        { metricName: 'clicks', value: 200, timestamp: new Date() },
        { metricName: 'spend', value: 100, timestamp: new Date() },
        { metricName: 'conversions', value: 20, timestamp: new Date() },
      ],
    },
  ];

  const previousMetrics: PlatformMetrics[] = [
    {
      platformId: 'meta',
      platformName: 'Meta',
      fetchedAt: new Date('2026-05-01'),
      metrics: [
        { metricName: 'impressions', value: 1000, timestamp: new Date() },
        { metricName: 'clicks', value: 100, timestamp: new Date() },
        { metricName: 'spend', value: 50, timestamp: new Date() },
        { metricName: 'conversions', value: 10, timestamp: new Date() },
      ],
    },
  ];

  it('computes period-over-period deltas when previous metrics are supplied', () => {
    const summary = service.computeReportSummary(currentMetrics, previousMetrics);

    expect(summary.totalImpressions).toBe(2000);
    expect(summary.totalClicks).toBe(200);
    expect(summary.totalSpend).toBe(100);
    expect(summary.totalConversions).toBe(20);
    expect(summary.periodOverPeriod).toEqual({
      impressionsChange: 100,
      clicksChange: 100,
      spendChange: 100,
      conversionsChange: 100,
    });
  });

  it('omits periodOverPeriod when no previous metrics are provided', () => {
    const summary = service.computeReportSummary(currentMetrics);
    expect(summary.periodOverPeriod).toBeUndefined();
  });

  it('returns zero deltas when the previous period had no activity', () => {
    const emptyPrevious: PlatformMetrics[] = [
      {
        platformId: 'meta',
        platformName: 'Meta',
        fetchedAt: new Date('2026-05-01'),
        metrics: [],
      },
    ];

    const summary = service.computeReportSummary(currentMetrics, emptyPrevious);
    expect(summary.periodOverPeriod).toEqual({
      impressionsChange: 0,
      clicksChange: 0,
      spendChange: 0,
      conversionsChange: 0,
    });
  });
});
