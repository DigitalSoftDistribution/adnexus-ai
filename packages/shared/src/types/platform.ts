export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PlatformAccount {
  id: string;
  platform: 'META' | 'GOOGLE' | 'TIKTOK' | 'SNAP' | 'LINKEDIN';
  platformAccountId: string;
  name: string;
  status: 'ACTIVE' | 'DISCONNECTED' | 'ERROR';
  currency?: string;
  timezone?: string;
}

export interface CampaignInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa?: number;
  roas?: number;
  frequency?: number;
  cpm?: number;
  cpc?: number;
}
