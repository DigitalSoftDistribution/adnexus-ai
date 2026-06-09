import type { Campaign } from './api-campaigns';

/* ═════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD EXTENSIONS                                               */
/* ═════════════════════════════════════════════════════════════════════ */

export interface CampaignSummary {
  totalSpend: number;
  totalSpendChange: number;
  roas: number;
  roasChange: number;
  conversions: number;
  conversionsChange: number;
  ctr: number;
  ctrChange: number;
  cpa: number;
  cpaChange: number;
  impressions: number;
  clicks: number;
}

export interface PlatformMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpa: number;
  color: string;
}

export interface DailySpend {
  date: string;
  meta: number;
  google: number;
  tiktok: number;
  snap: number;
}

export interface CampaignStatusBreakdown {
  active: number;
  paused: number;
  ended: number;
  draft: number;
}

export interface DraftItem {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  campaignName: string;
  createdAt: string;
}

export interface RuleTrigger {
  id: string;
  ruleName: string;
  campaignName: string;
  action: string;
  triggeredAt: string;
  status: 'executed' | 'pending' | 'failed';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  createdAt: string;
  read: boolean;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  campaignName?: string;
  createdAt: string;
  dismissed: boolean;
}

export interface DashboardData {
  summary: CampaignSummary;
  platformMetrics: PlatformMetrics[];
  dailySpend: DailySpend[];
  campaigns: Campaign[];
  statusBreakdown: CampaignStatusBreakdown;
  recentDrafts: DraftItem[];
  recentTriggers: RuleTrigger[];
  recentNotifications: NotificationItem[];
  alerts: AlertItem[];
}

export function generateFallbackDashboardData(_days: number): DashboardData {
  const now = new Date();
  const dailySpend: DailySpend[] = Array.from({ length: _days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (_days - 1 - i));
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      meta: Math.round(750 + Math.sin(i * 0.3) * 200 + Math.random() * 100),
      google: Math.round(480 + Math.cos(i * 0.25) * 150 + Math.random() * 80),
      tiktok: Math.round(260 + Math.sin(i * 0.4) * 100 + Math.random() * 60),
      snap: Math.round(160 + Math.cos(i * 0.35) * 60 + Math.random() * 40),
    };
  });

  const platforms: PlatformMetrics[] = [
    { platform: 'Meta', spend: 12400, impressions: 520000, clicks: 14560, conversions: 340, roas: 4.2, ctr: 2.8, cpa: 36.5, color: '#1877F2' },
    { platform: 'Google', spend: 10800, impressions: 380000, clicks: 15960, conversions: 520, roas: 6.1, ctr: 4.2, cpa: 20.8, color: '#EA4335' },
    { platform: 'TikTok', spend: 4200, impressions: 180000, clicks: 2880, conversions: 156, roas: 4.5, ctr: 1.6, cpa: 26.9, color: '#00F2EA' },
    { platform: 'Snap', spend: 2800, impressions: 95000, clicks: 760, conversions: 73, roas: 3.3, ctr: 0.8, cpa: 38.4, color: '#FFFC00' },
  ];

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalConversions = platforms.reduce((s, p) => s + p.conversions, 0);
  const totalClicks = platforms.reduce((s, p) => s + p.clicks, 0);
  const totalImpressions = platforms.reduce((s, p) => s + p.impressions, 0);

  return {
    summary: {
      totalSpend,
      totalSpendChange: 12.3,
      roas: 4.1,
      roasChange: 8.1,
      conversions: totalConversions,
      conversionsChange: 24.6,
      ctr: (totalClicks / totalImpressions) * 100,
      ctrChange: -0.3,
      cpa: totalSpend / totalConversions,
      cpaChange: -5.2,
      impressions: totalImpressions,
      clicks: totalClicks,
    },
    platformMetrics: platforms,
    dailySpend,
    campaigns: [
      { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', spend: 12400, impressions: 520000, clicks: 14560, conversions: 340, ctr: 2.8, roas: 4.2, cpa: 36.5, budget: 15000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-15', updatedAt: '2026-01-20' },
      { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', spend: 10800, impressions: 380000, clicks: 15960, conversions: 520, ctr: 4.2, roas: 6.1, cpa: 20.8, budget: 12000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Target CPA', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Search'], createdAt: '2026-01-10', updatedAt: '2026-01-20' },
      { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', spend: 8200, impressions: 280000, clicks: 9520, conversions: 210, ctr: 3.4, roas: 5.8, cpa: 39.0, budget: 10000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Cost Cap', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-20', updatedAt: '2026-01-20' },
      { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', spend: 7200, impressions: 210000, clicks: 6300, conversions: 380, ctr: 3.0, roas: 3.5, cpa: 18.9, budget: 8000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Maximize Conversions', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-12', updatedAt: '2026-01-20' },
      { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', spend: 4200, impressions: 180000, clicks: 2880, conversions: 156, ctr: 1.6, roas: 4.5, cpa: 26.9, budget: 6000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Cost Cap', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['UGC'], createdAt: '2026-01-18', updatedAt: '2026-01-20' },
    ],
    statusBreakdown: { active: 14, paused: 4, ended: 2, draft: 3 },
    recentDrafts: [
      { id: 'd1', title: 'Pause campaign "Display - Remarketing"', type: 'pause', status: 'pending', campaignName: 'Display - Remarketing', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
      { id: 'd2', title: 'Increase Meta budget by 20%', type: 'budget', status: 'pending', campaignName: 'Summer Sale 2026', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
      { id: 'd3', title: 'Duplicate "Spark Ads - UGC" for new audience', type: 'duplicate', status: 'approved', campaignName: 'Spark Ads - UGC', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    ],
    recentTriggers: [
      { id: 't1', ruleName: 'High CPA Alert', campaignName: 'Display - Remarketing', action: 'Create pause draft', triggeredAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'executed' },
      { id: 't2', ruleName: 'ROAS Scale Rule', campaignName: 'Summer Sale 2026', action: 'Increase budget 20%', triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'executed' },
      { id: 't3', ruleName: 'Creative Fatigue', campaignName: 'FYP - Viral Hook', action: 'Notify team', triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'pending' },
    ],
    recentNotifications: [
      { id: 'n1', title: 'AI Agent increased Meta budget', message: 'Budget raised by 15% due to strong ROAS performance', type: 'success', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), read: false },
      { id: 'n2', title: 'Creative fatigue detected', message: '2 ads in "FYP - Viral Hook" showing declining CTR', type: 'warning', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), read: false },
      { id: 'n3', title: 'Weekly report generated', message: 'Your Google Ads performance report is ready', type: 'info', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), read: true },
    ],
    alerts: [
      { id: 'a1', severity: 'critical', title: 'CPA Exceeded Threshold', message: 'Campaign "Display - Remarketing" CPA exceeded $50 -- draft created to pause', campaignName: 'Display - Remarketing', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), dismissed: false },
      { id: 'a2', severity: 'warning', title: 'Goal At Risk', message: 'Goal "Q1 ROAS Target" is at risk (current: 2.1x, target: 3.0x)', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), dismissed: false },
      { id: 'a3', severity: 'warning', title: 'Budget 80% Utilized', message: 'Campaign "PMax - Ecommerce" has used 80% of its monthly budget', campaignName: 'PMax - Ecommerce', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), dismissed: false },
    ],
  };
}
