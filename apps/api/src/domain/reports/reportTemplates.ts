export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  default_metrics: string[];
  default_filters: Record<string, unknown>;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'performance-summary',
    name: 'Performance Summary',
    description:
      'Overview of campaign performance across all platforms including KPIs, trends, and platform breakdowns.',
    type: 'performance',
    default_metrics: ['spend', 'impressions', 'clicks', 'conversions', 'roas', 'cpa', 'ctr'],
    default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'], status: ['active'] },
  },
  {
    id: 'creative-analysis',
    name: 'Creative Analysis',
    description:
      'Analyze creative performance, fatigue scores, and CTR trends to identify winning and exhausted ads.',
    type: 'creative',
    default_metrics: ['impressions', 'clicks', 'ctr', 'fatigue_score', 'spend', 'conversions'],
    default_filters: { creative_types: ['image', 'video', 'carousel'] },
  },
  {
    id: 'budget-review',
    name: 'Budget Review',
    description:
      'Track budget utilization, pacing, and efficiency metrics across campaigns and platforms.',
    type: 'budget',
    default_metrics: ['spend', 'budget', 'pacing_pct', 'roas', 'cpa', 'conversions'],
    default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'] },
  },
  {
    id: 'cross-platform-comparison',
    name: 'Cross-Platform Comparison',
    description:
      'Compare performance side-by-side across Meta, Google, TikTok, and Snap with normalized metrics.',
    type: 'performance',
    default_metrics: ['spend', 'roas', 'ctr', 'cpa', 'conversions', 'impressions'],
    default_filters: { platforms: ['meta', 'google', 'tiktok', 'snap'] },
  },
];
