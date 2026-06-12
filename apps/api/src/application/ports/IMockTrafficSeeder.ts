export type MockTrafficPlatform = 'meta' | 'google' | 'tiktok' | 'snap';

export interface MockTrafficSeedOptions {
  workspaceId: string;
  userId: string;
  platforms: MockTrafficPlatform[];
  variant: 'baseline' | 'high_spend' | 'low_roas';
}

export interface MockTrafficSeedResult {
  workspaceId: string;
  accountsSeeded: number;
  campaignsSeeded: number;
  adSetsSeeded: number;
  adsSeeded: number;
  metricsSeeded: number;
  platforms: MockTrafficPlatform[];
  accountIds: string[];
  /** Distinct campaign status values present after seeding. */
  campaignStatuses: string[];
}

export interface IMockTrafficSeeder {
  seed(options: MockTrafficSeedOptions): Promise<MockTrafficSeedResult>;
}
