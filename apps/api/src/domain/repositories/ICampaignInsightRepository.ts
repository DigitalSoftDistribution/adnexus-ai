import type { CampaignInsight, CampaignInsightSummary } from '../entities/CampaignInsight';

export interface ICampaignInsightRepository {
  getDailyBreakdown(campaignId: string, dateFrom?: string, dateTo?: string): Promise<CampaignInsight[]>;
  getSummary(campaignId: string, dateFrom?: string, dateTo?: string): Promise<CampaignInsightSummary>;
  create(insight: Omit<CampaignInsight, 'id' | 'createdAt'>): Promise<CampaignInsight>;
}
