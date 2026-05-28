import type { Result } from '../../domain/value-objects/Result';

export interface PlatformCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  budget?: number;
  budgetType?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  conversions?: number;
  startDate?: string;
  endDate?: string;
  platformData?: Record<string, unknown>;
}

export interface PlatformAdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  budget?: number;
  bidAmount?: number;
  targeting?: Record<string, unknown>;
}

export interface PlatformAd {
  id: string;
  name: string;
  adsetId: string;
  status: string;
  creativeType?: string;
  creativeData?: Record<string, unknown>;
  previewUrl?: string;
}

export interface IPlatformClient {
  readonly platform: string;

  // Campaigns
  listCampaigns(accountId: string): Promise<Result<PlatformCampaign[]>>;
  getCampaign(campaignId: string): Promise<Result<PlatformCampaign>>;
  createCampaign(accountId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>>;
  updateCampaign(campaignId: string, data: Record<string, unknown>): Promise<Result<PlatformCampaign>>;
  pauseCampaign(campaignId: string): Promise<Result<void>>;
  activateCampaign(campaignId: string): Promise<Result<void>>;

  // AdSets
  listAdSets(campaignId: string): Promise<Result<PlatformAdSet[]>>;
  updateAdSet(adsetId: string, data: Record<string, unknown>): Promise<Result<PlatformAdSet>>;

  // Ads
  listAds(adsetId: string): Promise<Result<PlatformAd[]>>;
  updateAd(adId: string, data: Record<string, unknown>): Promise<Result<PlatformAd>>;

  // Insights
  getInsights(
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    dateRange: { since: string; until: string },
    fields?: string[],
  ): Promise<Result<Record<string, unknown>>>;

  // Health
  healthCheck(): Promise<Result<{ status: string; latencyMs: number }>>;
}
