import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CrossPlatformData {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  color: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  value?: number;
  platformBreakdown?: Record<string, number>;
}

export interface ReportCampaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  campaign?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type?: string;
  schedule?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'csv' | 'xlsx';
  includePlatforms: string[];
  lastSent?: string;
  lastRun?: string;
  nextSend: string;
  isActive: boolean;
  active?: boolean;
  createdAt: string;
}

export interface KpiSummary {
  totalSpend: number;
  totalSpendChange: number;
  totalSpendPrev?: number;
  impressions: number;
  impressionsChange: number;
  clicks: number;
  clicksChange: number;
  conversions: number;
  conversionsChange: number;
  totalConversions?: number;
  totalConversionsPrev?: number;
  ctr: number;
  ctrChange: number;
  avgCtr?: number;
  avgCtrPrev?: number;
  cpa: number;
  cpaChange: number;
  avgCpa?: number;
  avgCpaPrev?: number;
  roas: number;
  roasChange: number;
  avgRoas?: number;
  avgRoasPrev?: number;
}

/* ──────────────── Reports Mock Data ──────────────── */

let MOCK_SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'sr_1', name: 'Weekly Performance Summary', frequency: 'weekly', recipients: ['john@company.com', 'jane@company.com'], format: 'pdf', includePlatforms: ['Meta', 'Google', 'TikTok', 'Snap'], lastSent: '2026-06-14T09:00:00Z', nextSend: '2026-06-21T09:00:00Z', isActive: true, createdAt: '2026-01-15T10:00:00Z' },
  { id: 'sr_2', name: 'Daily Spend Alert', frequency: 'daily', recipients: ['john@company.com'], format: 'csv', includePlatforms: ['Meta', 'Google'], lastSent: '2026-06-18T08:00:00Z', nextSend: '2026-06-19T08:00:00Z', isActive: true, createdAt: '2026-02-01T14:00:00Z' },
  { id: 'sr_3', name: 'Monthly ROAS Report', frequency: 'monthly', recipients: ['team@company.com', 'exec@company.com'], format: 'xlsx', includePlatforms: ['Meta', 'Google', 'TikTok', 'Snap'], lastSent: '2026-05-01T10:00:00Z', nextSend: '2026-07-01T10:00:00Z', isActive: true, createdAt: '2026-01-10T09:00:00Z' },
  { id: 'sr_4', name: 'Creative Fatigue Alert', frequency: 'weekly', recipients: ['creative@company.com'], format: 'pdf', includePlatforms: ['Meta', 'TikTok'], lastSent: '2026-06-10T11:00:00Z', nextSend: '2026-06-17T11:00:00Z', isActive: false, createdAt: '2026-03-05T16:00:00Z' },
  { id: 'sr_5', name: 'CPA Monitoring', frequency: 'daily', recipients: ['john@company.com', 'bob@company.com'], format: 'csv', includePlatforms: ['Google', 'Snap'], lastSent: '2026-06-18T07:30:00Z', nextSend: '2026-06-19T07:30:00Z', isActive: true, createdAt: '2026-04-12T10:30:00Z' },
];

const generateTrendData = (days: number): TrendPoint[] => {
  const data: TrendPoint[] = [];
  const now = new Date();
  let baseValue = 4500 + Math.random() * 1000;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    baseValue = baseValue * (0.92 + Math.random() * 0.18);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(baseValue),
    });
  }
  return data;
};

export const reportsApi = {
  async getKpiSummary(_days?: number): Promise<KpiSummary> {
    await delay(300 + Math.random() * 200);
    return {
      totalSpend: 145820.50,
      totalSpendChange: 12.3,
      totalSpendPrev: 129845.20,
      impressions: 2345689,
      impressionsChange: 8.7,
      clicks: 67842,
      clicksChange: 15.2,
      conversions: 12488,
      conversionsChange: 24.6,
      totalConversions: 12488,
      totalConversionsPrev: 10020,
      ctr: 2.89,
      ctrChange: -0.3,
      avgCtr: 2.89,
      avgCtrPrev: 2.90,
      cpa: 11.68,
      cpaChange: -5.2,
      avgCpa: 11.68,
      avgCpaPrev: 12.32,
      roas: 3.42,
      roasChange: 8.1,
      avgRoas: 3.42,
      avgRoasPrev: 3.16,
    };
  },
  async getCrossPlatform(_days?: number): Promise<CrossPlatformData[]> {
    await delay(300 + Math.random() * 200);
    return [
      { platform: 'Meta', spend: 48500, impressions: 890000, clicks: 25620, conversions: 4520, ctr: 2.88, cpa: 10.73, roas: 3.8, color: '#1877F2' },
      { platform: 'Google', spend: 52300, impressions: 756000, clicks: 30240, conversions: 5840, ctr: 4.00, cpa: 8.95, roas: 4.2, color: '#EA4335' },
      { platform: 'TikTok', spend: 28400, impressions: 456000, clicks: 6384, conversions: 1520, ctr: 1.40, cpa: 18.68, roas: 2.5, color: '#00F2EA' },
      { platform: 'Snap', spend: 16620.50, impressions: 243689, clicks: 5598, conversions: 608, ctr: 2.30, cpa: 27.34, roas: 1.8, color: '#FFFC00' },
    ];
  },
  async getSpendTrend(_days?: number): Promise<TrendPoint[]> {
    await delay(300 + Math.random() * 200);
    return generateTrendData(_days || 30);
  },
  async getFunnelAnalysis(_days?: number): Promise<FunnelStage[]> {
    await delay(300 + Math.random() * 200);
    return [
      { stage: 'Impressions', count: 2345689, percentage: 100, value: 2345689, platformBreakdown: { Meta: 890000, Google: 756000, TikTok: 456000, Snap: 243689 } },
      { stage: 'Clicks', count: 67842, percentage: 2.89, value: 67842, platformBreakdown: { Meta: 25620, Google: 30240, TikTok: 6384, Snap: 5598 } },
      { stage: 'Landing Page', count: 54273, percentage: 80.0, value: 54273, platformBreakdown: { Meta: 20496, Google: 24192, TikTok: 5107, Snap: 4478 } },
      { stage: 'Add to Cart', count: 18732, percentage: 34.5, value: 18732, platformBreakdown: { Meta: 7684, Google: 8448, TikTok: 1536, Snap: 1064 } },
      { stage: 'Purchase', count: 12488, percentage: 66.7, value: 12488, platformBreakdown: { Meta: 4520, Google: 5840, TikTok: 1520, Snap: 608 } },
    ];
  },
  async getFunnel(_days?: number): Promise<FunnelStage[]> {
    return this.getFunnelAnalysis(_days);
  },
  async getTopCampaigns(_days?: number, _limit?: number): Promise<ReportCampaign[]> {
    await delay(300 + Math.random() * 200);
    return [
      { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', spend: 12400, impressions: 445000, clicks: 12460, conversions: 340, ctr: 2.8, cpa: 36.5, roas: 4.2, campaign: 'Summer Sale 2026' },
      { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', spend: 10800, impressions: 257000, clicks: 10794, conversions: 520, ctr: 4.2, cpa: 20.8, roas: 6.1, campaign: 'Search - Brand Terms' },
      { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', spend: 15200, impressions: 844000, clicks: 15192, conversions: 380, ctr: 1.8, cpa: 40.0, roas: 3.5, campaign: 'PMax - Ecommerce' },
      { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', spend: 8200, impressions: 165000, clicks: 5610, conversions: 210, ctr: 3.4, cpa: 39.0, roas: 5.8, campaign: 'Retargeting - Cart Abandoners' },
      { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', spend: 7800, impressions: 487000, clicks: 7808, conversions: 198, ctr: 1.6, cpa: 39.4, roas: 3.1, campaign: 'Spark Ads - UGC' },
      { id: 'c11', name: 'FYP - Viral Hook', platform: 'TikTok', status: 'Active', spend: 4200, impressions: 191000, clicks: 4202, conversions: 156, ctr: 2.2, cpa: 26.9, roas: 4.5, campaign: 'FYP - Viral Hook' },
      { id: 'c2', name: 'Brand Awareness Q2', platform: 'Meta', status: 'Active', spend: 6830, impressions: 683000, clicks: 8196, conversions: 89, ctr: 1.2, cpa: 76.7, roas: 1.8, campaign: 'Brand Awareness Q2' },
      { id: 'c16', name: 'Snap Ads - App Install', platform: 'Snap', status: 'Active', spend: 3800, impressions: 317000, clicks: 3804, conversions: 95, ctr: 1.2, cpa: 40.0, roas: 2.9, campaign: 'Snap Ads - App Install' },
    ];
  },
  async getCampaignPerformance(_days?: number, _limit?: number): Promise<ReportCampaign[]> {
    return this.getTopCampaigns(_days, _limit);
  },
  async getScheduledReports(): Promise<ScheduledReport[]> {
    await delay(300 + Math.random() * 200);
    return [...MOCK_SCHEDULED_REPORTS];
  },
  async createScheduledReport(input: Partial<ScheduledReport>): Promise<ScheduledReport> {
    await delay(500);
    const report: ScheduledReport = {
      id: `sr_${Date.now()}`,
      name: input.name || 'Untitled Report',
      frequency: input.frequency || 'weekly',
      recipients: input.recipients || [],
      format: input.format || 'pdf',
      includePlatforms: input.includePlatforms || ['Meta', 'Google'],
      nextSend: input.nextSend || new Date(Date.now() + 86400000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    MOCK_SCHEDULED_REPORTS.push(report);
    return report;
  },
  async updateScheduledReport(id: string, input: Partial<ScheduledReport>): Promise<ScheduledReport> {
    await delay(400);
    const idx = MOCK_SCHEDULED_REPORTS.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Report not found');
    MOCK_SCHEDULED_REPORTS[idx] = { ...MOCK_SCHEDULED_REPORTS[idx], ...input };
    return MOCK_SCHEDULED_REPORTS[idx];
  },
  async deleteScheduledReport(id: string): Promise<void> {
    await delay(300);
    MOCK_SCHEDULED_REPORTS = MOCK_SCHEDULED_REPORTS.filter((r) => r.id !== id);
  },
  async sendReportNow(_id: string): Promise<void> {
    await delay(800);
  },
  async exportCampaignsToCsv(campaigns: ReportCampaign[]): Promise<string> {
    await delay(300);
    const headers = ['Campaign', 'Platform', 'Status', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'CPA', 'ROAS'];
    const rows = campaigns.map((c) => [
      c.name, c.platform, c.status, c.spend, c.impressions, c.clicks,
      c.ctr + '%', c.conversions, '$' + c.cpa, c.roas + 'x',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
