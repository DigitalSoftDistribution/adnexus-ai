export type MockTrafficPlatform = 'meta' | 'google';

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
  metricsSeeded: number;
  platforms: MockTrafficPlatform[];
  accountIds: string[];
}

export interface IMockTrafficSeeder {
  seed(options: MockTrafficSeedOptions): Promise<MockTrafficSeedResult>;
}
