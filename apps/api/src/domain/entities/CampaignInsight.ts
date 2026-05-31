export interface CampaignInsight {
  id: string;
  campaignId: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  reach: number | null;
  createdAt: Date;
}

export interface CampaignInsightSummary {
  campaignId: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
  avgCpm: number;
  avgCpc: number;
  dailyBreakdown: CampaignInsight[];
  platformBreakdown: Record<string, number>;
}
