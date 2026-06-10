import type {
  IPlatformSyncService,
  SyncAccountContext,
  SyncAccountResult,
  SyncCampaignContext,
  SyncedCampaignMetrics,
} from '../../application/ports/IPlatformSyncService';
import type { Platform } from '../../domain/entities/Campaign';

const ZERO_METRICS: SyncedCampaignMetrics = {
  spend: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  conversions: 0,
  cpa: 0,
  roas: 0,
  frequency: 0,
  cpm: 0,
  cpc: 0,
};

const MOCK_SYNC_FIXTURES: Record<'tiktok' | 'snap', SyncAccountResult> = {
  tiktok: {
    campaigns: [
      {
        platformCampaignId: 'tt_mock_campaign_001',
        name: 'TikTok Mock Readiness Campaign',
        status: 'paused',
        objective: 'conversions',
        dailyBudget: 125,
        lifetimeBudget: null,
        budgetType: 'daily',
        startDate: '2026-06-01',
        endDate: null,
        metrics: {
          spend: 42.5,
          impressions: 12000,
          clicks: 480,
          ctr: 4,
          conversions: 24,
          cpa: 1.77,
          roas: 3.2,
          frequency: 1.1,
          cpm: 3.54,
          cpc: 0.09,
        },
        adSets: [
          {
            platformAdSetId: 'tt_mock_adgroup_001',
            name: 'TikTok Mock Ad Group',
            status: 'paused',
            dailyBudget: 125,
            targeting: { source: 'mock-readiness', platform: 'tiktok' },
            ads: [
              {
                platformAdId: 'tt_mock_ad_001',
                name: 'TikTok Mock Video Ad',
                status: 'paused',
                creativeType: 'video',
                creativeText: 'Mock TikTok creative for contract tests only',
              },
            ],
          },
        ],
      },
    ],
    errors: [],
  },
  snap: {
    campaigns: [
      {
        platformCampaignId: 'snap_mock_campaign_001',
        name: 'Snapchat Mock Readiness Campaign',
        status: 'paused',
        objective: 'awareness',
        dailyBudget: 100,
        lifetimeBudget: null,
        budgetType: 'daily',
        startDate: '2026-06-01',
        endDate: null,
        metrics: {
          spend: 37.25,
          impressions: 9000,
          clicks: 315,
          ctr: 3.5,
          conversions: 9,
          cpa: 4.14,
          roas: 1.8,
          frequency: 1.3,
          cpm: 4.14,
          cpc: 0.12,
        },
        adSets: [
          {
            platformAdSetId: 'snap_mock_adsquad_001',
            name: 'Snapchat Mock Ad Squad',
            status: 'paused',
            dailyBudget: 100,
            targeting: { source: 'mock-readiness', platform: 'snap' },
            ads: [
              {
                platformAdId: 'snap_mock_ad_001',
                name: 'Snapchat Mock Story Ad',
                status: 'paused',
                creativeType: 'story',
                creativeText: 'Mock Snapchat creative for contract tests only',
              },
            ],
          },
        ],
      },
    ],
    errors: [],
  },
};

export class MockSocialPlatformSyncService implements IPlatformSyncService {
  constructor(private readonly enabled: boolean) {}

  supports(platform: Platform): boolean {
    return this.enabled && (platform === 'tiktok' || platform === 'snap');
  }

  async syncCampaign(ctx: SyncCampaignContext): Promise<SyncedCampaignMetrics | null> {
    if (!this.supports(ctx.platform)) return null;
    const fixture = MOCK_SYNC_FIXTURES[ctx.platform as 'tiktok' | 'snap'];
    const campaign = fixture.campaigns.find((c) => c.platformCampaignId === ctx.platformCampaignId);
    return campaign?.metrics ?? { ...ZERO_METRICS, status: 'paused' };
  }

  async syncAccount(ctx: SyncAccountContext): Promise<SyncAccountResult | null> {
    if (!this.supports(ctx.platform)) return null;
    const fixture = MOCK_SYNC_FIXTURES[ctx.platform as 'tiktok' | 'snap'];
    return {
      campaigns: fixture.campaigns.map((campaign) => ({ ...campaign })),
      errors: fixture.errors.map((error) => ({ ...error })),
    };
  }
}
