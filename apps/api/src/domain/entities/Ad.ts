export type AdStatus = 'active' | 'paused' | 'archived' | 'draft' | 'pending' | 'deleted';
export type CreativeType = 'image' | 'video' | 'carousel' | 'collection' | 'text';

export interface Ad {
  id: string;
  workspaceId: string;
  campaignId: string;
  adsetId: string;
  platformAdId: string | null;
  name: string;
  status: AdStatus;
  creativeType: CreativeType | null;
  creativeUrl: string | null;
  creativeText: string | null;
  headline: string | null;
  body: string | null;
  callToAction: string | null;
  landingPageUrl: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  cpm: number | null;
  cpc: number | null;
  fatigueScore: number | null;
  fatigueStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
  platformData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdPerformance {
  adId: string;
  adName: string;
  dateFrom: string;
  dateTo: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  cpm: number;
  cpc: number;
}

export interface AdCreativePerformance {
  adId: string;
  adName: string;
  creativeType: string | null;
  creativeUrl: string | null;
  fatigue: {
    score: number;
    status: string;
    frequency: number;
    riskLevel: string;
    recommendation: string;
    estimatedDaysToFatigue: number;
  };
  ctrTrend: {
    current: number;
    direction: string;
    estimatedNextWeek: number;
  };
  conversionTrend: {
    current: number;
    direction: string;
    estimatedNextWeek: number;
  };
  overallHealthScore: number;
}
