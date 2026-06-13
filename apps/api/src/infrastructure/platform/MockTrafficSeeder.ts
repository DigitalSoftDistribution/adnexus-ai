import { query } from '../database/connection';
import type {
  IMockTrafficSeeder,
  MockTrafficPlatform,
  MockTrafficSeedOptions,
  MockTrafficSeedResult,
} from '../../application/ports/IMockTrafficSeeder';
import type { SyncedCampaignMetrics } from '../../application/ports/IPlatformSyncService';
import { writeCampaignMetrics } from './syncPersistence';
import { oauthTokensForDbWrite } from '../../security/oauth-token-crypto';
import {
  harnessTokenForSeedPlatform,
  WIREMOCK_HARNESS_ACCOUNT_IDS,
} from './mockHarnessTokens';

interface MockCampaignFixture {
  platformCampaignId: string;
  name: string;
  status: 'active' | 'paused';
  objective: string;
  dailyBudget: number;
  base: SyncedCampaignMetrics;
}

interface MockAdSetFixture {
  platformAdSetId: string;
  name: string;
  status: 'active' | 'paused';
  dailyBudget: number;
}

interface MockAdFixture {
  platformAdId: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  creativeType: string;
  creativeUrl: string;
  creativeText: string;
  fatigueScore?: number;
  fatigueStatus?: 'healthy' | 'warning' | 'critical' | 'exhausted';
}

const ALL_PLATFORMS: MockTrafficPlatform[] = ['meta', 'google', 'tiktok', 'snap'];

const PLATFORM_LABELS: Record<MockTrafficPlatform, string> = {
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  snap: 'Snap',
};

const ACCOUNT_FIXTURES: Record<MockTrafficPlatform, { platformAccountId: string; name: string }> = {
  meta: { platformAccountId: WIREMOCK_HARNESS_ACCOUNT_IDS.meta, name: 'QA Meta Ads Account' },
  google: { platformAccountId: WIREMOCK_HARNESS_ACCOUNT_IDS.google, name: 'QA Google Ads Account' },
  tiktok: { platformAccountId: 'tt_adv_123', name: 'QA TikTok Ads Account' },
  snap: { platformAccountId: 'snap_adacct_123', name: 'QA Snapchat Ads Account' },
};

/** OAuth expiry far enough out that preview sync skips refresh during QA. */
function mockTokenExpiryIso(): string {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

/** Per-platform campaign metric baselines (active, paused). */
const CAMPAIGN_METRIC_BASES: Record<MockTrafficPlatform, [SyncedCampaignMetrics, SyncedCampaignMetrics]> = {
  meta: [
    metric(1840, 124000, 3360, 185, 9.4, 1.8),
    metric(760, 42000, 1540, 118, 6.7, 2.2),
  ],
  google: [
    metric(620, 31500, 2180, 96, 5.8, 1.5),
    metric(2125, 168000, 4200, 210, 8.1, 1.4),
  ],
  tiktok: [
    metric(420, 33870, 689, 48, 4.2, 2.1),
    metric(280, 22400, 410, 31, 3.6, 2.8),
  ],
  snap: [
    metric(560, 28800, 780, 51, 3.9, 1.9),
    metric(190, 14200, 290, 18, 2.8, 2.4),
  ],
};

const CAMPAIGN_OBJECTIVES: Record<MockTrafficPlatform, [string, string]> = {
  meta: ['sales', 'sales'],
  google: ['traffic', 'sales'],
  tiktok: ['conversions', 'traffic'],
  snap: ['sales', 'engagement'],
};

const AD_STATUS_CYCLE: MockAdFixture['status'][] = ['active', 'paused', 'archived'];

/** Fatigue tiers — spread ~40/30/20/10 across the portfolio for dashboard QA. */
const FATIGUE_TIERS: Array<{ fatigueScore: number; fatigueStatus: MockAdFixture['fatigueStatus'] }> = [
  { fatigueScore: 18, fatigueStatus: 'healthy' },
  { fatigueScore: 22, fatigueStatus: 'healthy' },
  { fatigueScore: 48, fatigueStatus: 'warning' },
  { fatigueScore: 55, fatigueStatus: 'warning' },
  { fatigueScore: 72, fatigueStatus: 'critical' },
  { fatigueScore: 88, fatigueStatus: 'exhausted' },
];

interface PlatformCreativeTemplate {
  headline: string;
  body: string;
  cta: string;
  creativeType: string;
}

const PLATFORM_CREATIVES: Record<MockTrafficPlatform, PlatformCreativeTemplate[]> = {
  meta: [
    { headline: 'Summer Sale — 40% Off Sitewide', body: 'Limited time only. Free shipping on orders $50+.', cta: 'Shop Now', creativeType: 'image' },
    { headline: 'Meet Our Best Sellers', body: 'Thousands of 5-star reviews. See why customers love us.', cta: 'Learn More', creativeType: 'video' },
    { headline: 'New Collection Drop', body: 'Fresh styles just landed. Swipe through the lookbook.', cta: 'Sign Up', creativeType: 'carousel' },
    { headline: 'Flash Deal — 24 Hours', body: 'Extra 15% off with code FLASH24 at checkout.', cta: 'Get Offer', creativeType: 'image' },
    { headline: 'UGC Testimonial — Real Results', body: '"I was skeptical but this changed everything." — Jamie K.', cta: 'Shop Now', creativeType: 'video' },
    { headline: 'Bundle & Save 25%', body: 'Mix and match any 3 items. Automatically applied.', cta: 'Shop Now', creativeType: 'collection' },
  ],
  google: [
    { headline: 'Buy Official Products Online', body: 'Free returns · 2-day shipping · Price match guarantee.', cta: 'Buy Now', creativeType: 'responsive' },
    { headline: 'Search Brand — Official Store', body: 'Shop direct. No middlemen. Authentic products only.', cta: 'Get Offer', creativeType: 'image' },
    { headline: 'Limited Stock — Order Today', body: 'High demand item. Only 47 left in warehouse.', cta: 'Apply Now', creativeType: 'image' },
    { headline: 'Compare Plans & Pricing', body: 'Transparent pricing. Cancel anytime. No hidden fees.', cta: 'Learn More', creativeType: 'responsive' },
    { headline: 'Demo Video — See It In Action', body: 'Watch a 60-second product walkthrough.', cta: 'Watch Now', creativeType: 'video' },
    { headline: 'Download Free Buyer Guide', body: 'PDF guide: How to choose the right plan for your team.', cta: 'Download', creativeType: 'image' },
  ],
  tiktok: [
    { headline: 'POV: You found the deal of the year', body: 'Trending now · 2.1M views · Creator @shopwithus', cta: 'Shop Now', creativeType: 'video' },
    { headline: 'This hack went viral for a reason', body: 'Save this before it gets taken down 👀', cta: 'Watch More', creativeType: 'video' },
    { headline: 'GRWM using our bestsellers', body: 'Get ready with me — full routine linked in bio.', cta: 'Download', creativeType: 'video' },
    { headline: 'Unboxing + honest review', body: 'Not sponsored. Real talk about quality & value.', cta: 'Shop Now', creativeType: 'video' },
    { headline: 'Dupe vs Original — side by side', body: 'Same quality, half the price. Link in comments.', cta: 'Learn More', creativeType: 'spark' },
    { headline: 'Day-in-the-life brand edition', body: 'Behind the scenes at our studio. New drops weekly.', cta: 'Follow', creativeType: 'video' },
  ],
  snap: [
    { headline: 'Swipe Up — Exclusive Drop', body: '24-hour only. AR try-on available in Snap.', cta: 'Shop Now', creativeType: 'story' },
    { headline: 'Limited Edition — Sold Out Soon', body: 'Only on Snap. Free lens filter with purchase.', cta: 'View', creativeType: 'image' },
    { headline: 'Friend Referral Bonus', body: 'Invite 3 friends, get $20 off your next order.', cta: 'Sign Up', creativeType: 'image' },
    { headline: 'Snap Map Local Event', body: 'Pop-up this weekend. Check in for surprise discount.', cta: 'Learn More', creativeType: 'story' },
    { headline: 'Install App — First Order Free', body: 'New users only. Terms apply.', cta: 'Install Now', creativeType: 'app_install' },
    { headline: 'Poll: Which color next?', body: 'Vote in our Story. Winning shade ships Friday.', cta: 'Vote', creativeType: 'story' },
  ],
};

/** Platform-typical ad-level CTR baselines (percent). */
const PLATFORM_AD_CTR: Record<MockTrafficPlatform, number> = {
  meta: 1.85,
  google: 5.6,
  tiktok: 4.1,
  snap: 3.8,
};

function buildCampaignFixtures(platform: MockTrafficPlatform): MockCampaignFixture[] {
  const label = PLATFORM_LABELS[platform];
  const [activeBase, pausedBase] = CAMPAIGN_METRIC_BASES[platform];
  const [activeObjective, pausedObjective] = CAMPAIGN_OBJECTIVES[platform];
  return [
    {
      platformCampaignId: `mock_${platform}_cmp_active`,
      name: `QA ${label} - Active Campaign`,
      status: 'active',
      objective: activeObjective,
      dailyBudget: platform === 'snap' ? 220 : platform === 'google' ? 120 : 180,
      base: activeBase,
    },
    {
      platformCampaignId: `mock_${platform}_cmp_paused`,
      name: `QA ${label} - Paused Campaign`,
      status: 'paused',
      objective: pausedObjective,
      dailyBudget: platform === 'snap' ? 150 : platform === 'google' ? 240 : 95,
      base: pausedBase,
    },
  ];
}

const AD_SET_SEGMENTS = ['Prospecting', 'Retargeting', 'Lookalike'] as const;

function buildAdSetFixtures(campaign: MockCampaignFixture): MockAdSetFixture[] {
  const budgetShares = [0.4, 0.35, 0.25];
  return AD_SET_SEGMENTS.map((segment, index) => ({
    platformAdSetId: `${campaign.platformCampaignId}_as_${index + 1}`,
    name: `${campaign.name} — ${segment}`,
    status: index === 0 ? 'active' : index === 1 ? 'active' : 'paused',
    dailyBudget: Math.round(campaign.dailyBudget * budgetShares[index]),
  }));
}

function creativeIndex(platform: MockTrafficPlatform, adSet: MockAdSetFixture, adIndex: number): number {
  const adSetNum = Number(adSet.platformAdSetId.match(/_as_(\d+)$/)?.[1] ?? 1);
  return ((adSetNum - 1) * 3 + adIndex) % PLATFORM_CREATIVES[platform].length;
}

function formatCreativeText(template: PlatformCreativeTemplate): string {
  return `${template.headline} | ${template.body} | CTA: ${template.cta}`;
}

function buildAdFixtures(
  platform: MockTrafficPlatform,
  adSet: MockAdSetFixture,
): MockAdFixture[] {
  return AD_STATUS_CYCLE.map((status, index) => {
    const templateIdx = creativeIndex(platform, adSet, index);
    const template = PLATFORM_CREATIVES[platform][templateIdx];
    const fatigueIdx = (templateIdx + index) % FATIGUE_TIERS.length;
    const fatigue = FATIGUE_TIERS[fatigueIdx];
    const ext = template.creativeType === 'video' || template.creativeType === 'story' ? 'mp4' : 'jpg';

    return {
      platformAdId: `${adSet.platformAdSetId}_ad_${index + 1}`,
      name: template.headline,
      status,
      creativeType: template.creativeType,
      creativeUrl: `https://cdn.adnexus.ai/mock/${platform}/${adSet.platformAdSetId}_${index + 1}.${ext}`,
      creativeText: formatCreativeText(template),
      ...fatigue,
    };
  });
}

function adLevelMetrics(
  platform: MockTrafficPlatform,
  status: MockAdFixture['status'],
  fatigueScore: number,
): { spend: number; impressions: number; clicks: number; conversions: number; ctr: number; frequency: number } {
  const targetCtr = PLATFORM_AD_CTR[platform];
  const statusFactor = status === 'active' ? 1 : status === 'paused' ? 0.38 : 0.12;
  const spend = round((platform === 'google' ? 95 : platform === 'meta' ? 140 : 75) * statusFactor);
  const impressions = Math.max(
    500,
    Math.round(spend * (platform === 'google' ? 42 : platform === 'tiktok' ? 55 : 68)),
  );
  const clicks = Math.max(1, Math.round(impressions * (targetCtr / 100) * (1 - fatigueScore / 200)));
  const conversions = Math.max(1, Math.round(clicks * (platform === 'google' ? 0.08 : 0.05) * statusFactor));
  const ctr = round((clicks / impressions) * 100);
  return {
    spend,
    impressions,
    clicks,
    conversions,
    ctr,
    frequency: round(1.1 + fatigueScore / 80),
  };
}

function metric(
  spend: number,
  impressions: number,
  clicks: number,
  conversions: number,
  roas: number,
  frequency: number,
): SyncedCampaignMetrics {
  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    conversions,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas,
    frequency,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
  };
}

function applyVariant(m: SyncedCampaignMetrics, variant: MockTrafficSeedOptions['variant']): SyncedCampaignMetrics {
  const spendFactor = variant === 'high_spend' ? 1.7 : 1;
  const roasFactor = variant === 'low_roas' ? 0.42 : 1;
  const spend = round(m.spend * spendFactor);
  const conversions = Math.max(1, Math.round(m.conversions * (variant === 'low_roas' ? 0.55 : 1)));
  const clicks = Math.max(1, Math.round(m.clicks * spendFactor));
  const impressions = Math.max(clicks, Math.round(m.impressions * spendFactor));
  return {
    spend,
    impressions,
    clicks,
    ctr: round((clicks / impressions) * 100),
    conversions,
    cpa: round(spend / conversions),
    roas: round(m.roas * roasFactor),
    frequency: m.frequency,
    cpm: round((spend / impressions) * 1000),
    cpc: round(spend / clicks),
  };
}

function scaleDaily(m: SyncedCampaignMetrics, dayOffset: number): SyncedCampaignMetrics {
  const factor = 0.72 + dayOffset * 0.035;
  const spend = round(m.spend * factor / 14);
  const impressions = Math.max(1, Math.round(m.impressions * factor / 14));
  const clicks = Math.max(1, Math.round(m.clicks * factor / 14));
  const conversions = Math.max(1, Math.round(m.conversions * factor / 14));
  return {
    spend,
    impressions,
    clicks,
    ctr: round((clicks / impressions) * 100),
    conversions,
    cpa: round(spend / conversions),
    roas: m.roas,
    frequency: m.frequency,
    cpm: round((spend / impressions) * 1000),
    cpc: round(spend / clicks),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export class MockTrafficSeeder implements IMockTrafficSeeder {
  async seed(options: MockTrafficSeedOptions): Promise<MockTrafficSeedResult> {
    const accountIds: string[] = [];
    let campaignsSeeded = 0;
    let adSetsSeeded = 0;
    let adsSeeded = 0;
    let metricsSeeded = 0;
    const campaignStatuses = new Set<string>();

    for (const platform of options.platforms) {
      const accountId = await this.upsertAccount(options.workspaceId, platform);
      accountIds.push(accountId);
      let platformAdSets = 0;
      let platformAds = 0;

      for (const fixture of buildCampaignFixtures(platform)) {
        const metrics = applyVariant(fixture.base, options.variant);
        const campaignId = await this.upsertCampaign(
          options.workspaceId,
          accountId,
          platform,
          fixture,
          metrics,
        );
        campaignsSeeded++;
        campaignStatuses.add(fixture.status);

        for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
          await writeCampaignMetrics(campaignId, isoDateDaysAgo(daysAgo), scaleDaily(metrics, 13 - daysAgo));
          metricsSeeded++;
        }

        for (const adSetFixture of buildAdSetFixtures(fixture)) {
          const adSetId = await this.upsertAdSet(
            options.workspaceId,
            campaignId,
            platform,
            adSetFixture,
          );
          adSetsSeeded++;
          platformAdSets++;

          for (const adFixture of buildAdFixtures(platform, adSetFixture)) {
            await this.upsertAd(
              options.workspaceId,
              campaignId,
              adSetId,
              platform,
              adFixture,
            );
            adsSeeded++;
            platformAds++;
          }
        }
      }

      await this.recordSyncJob(
        options.workspaceId,
        accountId,
        platform,
        options.userId,
        buildCampaignFixtures(platform).length,
        platformAdSets,
        platformAds,
      );
    }

    return {
      workspaceId: options.workspaceId,
      accountsSeeded: accountIds.length,
      campaignsSeeded,
      adSetsSeeded,
      adsSeeded,
      metricsSeeded,
      platforms: options.platforms,
      accountIds,
      campaignStatuses: Array.from(campaignStatuses).sort(),
    };
  }

  private async upsertAccount(workspaceId: string, platform: MockTrafficPlatform): Promise<string> {
    const fixture = ACCOUNT_FIXTURES[platform];
    const harnessToken = harnessTokenForSeedPlatform(platform);
    const accessToken = harnessToken ?? `mock-${platform}-access-token`;
    const refreshToken = harnessToken ?? `mock-${platform}-refresh-token`;
    const tokens = oauthTokensForDbWrite(accessToken, refreshToken);
    const tokenExpiresAt = mockTokenExpiryIso();
    const metadata = {
      accountName: fixture.name,
      mockTraffic: true,
      seededBy: 'mock-traffic-harness',
      seedTag: 'qa-mock-traffic-2026-06-07',
      seededAt: new Date().toISOString(),
    };

    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM ad_accounts
       WHERE workspace_id = $1 AND platform = $2 AND platform_account_id = $3
       LIMIT 1`,
      [workspaceId, platform, fixture.platformAccountId],
    );

    if (existing[0]) {
      await query(
        `UPDATE ad_accounts SET
           name = $2,
           status = 'active',
           metadata = $3,
           account_id = COALESCE(account_id, $4),
           platform_account_id = $4,
           oauth_token = $5,
           refresh_token = $6,
           token_expires_at = $7,
           last_synced_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [
          existing[0].id,
          fixture.name,
          JSON.stringify(metadata),
          fixture.platformAccountId,
          tokens.oauth_token,
          tokens.refresh_token,
          tokenExpiresAt,
        ],
      );
      return existing[0].id;
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO ad_accounts (
         workspace_id, platform, platform_account_id, account_id, name, status,
         metadata, oauth_token, refresh_token, token_expires_at, last_synced_at
       )
       VALUES ($1, $2, $3, $3, $4, 'active', $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        workspaceId,
        platform,
        fixture.platformAccountId,
        fixture.name,
        JSON.stringify(metadata),
        tokens.oauth_token,
        tokens.refresh_token,
        tokenExpiresAt,
      ],
    );
    return rows[0].id;
  }

  private async upsertCampaign(
    workspaceId: string,
    accountId: string,
    platform: MockTrafficPlatform,
    fixture: MockCampaignFixture,
    metrics: SyncedCampaignMetrics,
  ): Promise<string> {
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM campaigns WHERE ad_account_id = $1 AND platform_campaign_id = $2 LIMIT 1`,
      [accountId, fixture.platformCampaignId],
    );

    const platformData = {
      mockTraffic: true,
      platform,
      seededBy: 'mock-traffic-harness',
      seedTag: 'qa-mock-traffic-2026-06-07',
      seededAt: new Date().toISOString(),
    };

    if (existing[0]) {
      await query(
        `UPDATE campaigns SET
           workspace_id = $2,
           platform = $3,
           name = $4,
           status = $5,
           objective = $6,
           budget_type = 'daily',
           daily_budget = $7,
           lifetime_budget = NULL,
           spend = $8,
           impressions = $9,
           clicks = $10,
           ctr = $11,
           conversions = $12,
           cpa = $13,
           roas = $14,
           frequency = $15,
           cpm = $16,
           cpc = $17,
           platform_data = $18,
           updated_at = NOW()
         WHERE id = $1`,
        [
          existing[0].id,
          workspaceId,
          platform,
          fixture.name,
          fixture.status,
          fixture.objective,
          fixture.dailyBudget,
          metrics.spend,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.conversions,
          metrics.cpa,
          metrics.roas,
          metrics.frequency,
          metrics.cpm,
          metrics.cpc,
          JSON.stringify(platformData),
        ],
      );
      return existing[0].id;
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO campaigns (
         workspace_id, ad_account_id, platform, platform_campaign_id, name, status, objective,
         budget_type, daily_budget, lifetime_budget, spend, impressions, clicks,
         ctr, conversions, cpa, roas, frequency, cpm, cpc, platform_data
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'daily', $8, NULL, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING id`,
      [
        workspaceId,
        accountId,
        platform,
        fixture.platformCampaignId,
        fixture.name,
        fixture.status,
        fixture.objective,
        fixture.dailyBudget,
        metrics.spend,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cpa,
        metrics.roas,
        metrics.frequency,
        metrics.cpm,
        metrics.cpc,
        JSON.stringify(platformData),
      ],
    );
    return rows[0].id;
  }

  /**
   * Upsert ad set — mirrors syncPersistence.upsertAdSet but targets the v2 `adsets`
   * table (workspace_id + platform) so GET /api/v2/ads joins resolve correctly.
   */
  private async upsertAdSet(
    workspaceId: string,
    campaignId: string,
    platform: MockTrafficPlatform,
    fixture: MockAdSetFixture,
  ): Promise<string> {
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM adsets WHERE campaign_id = $1 AND platform_adset_id = $2 LIMIT 1`,
      [campaignId, fixture.platformAdSetId],
    );

    const targeting = { mockTraffic: true, seedTag: 'qa-mock-traffic-2026-06-07' };

    if (existing[0]) {
      await query(
        `UPDATE adsets SET
           workspace_id = $2,
           platform = $3,
           name = $4,
           status = $5,
           daily_budget = $6,
           targeting = $7,
           updated_at = NOW()
         WHERE id = $1`,
        [
          existing[0].id,
          workspaceId,
          platform,
          fixture.name,
          fixture.status,
          fixture.dailyBudget,
          JSON.stringify(targeting),
        ],
      );
      return existing[0].id;
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO adsets (workspace_id, campaign_id, platform, platform_adset_id, name, status, daily_budget, targeting)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        workspaceId,
        campaignId,
        platform,
        fixture.platformAdSetId,
        fixture.name,
        fixture.status,
        fixture.dailyBudget,
        JSON.stringify(targeting),
      ],
    );
    return rows[0].id;
  }

  /** Production ads.status CHECK disallows `archived`; keep fixture label but persist draft. */
  private toDbAdStatus(status: MockAdFixture['status']): string {
    return status === 'archived' ? 'draft' : status;
  }

  /**
   * Upsert ad — mirrors syncPersistence.upsertAd with fatigue fields for QA dashboards.
   */
  private async upsertAd(
    workspaceId: string,
    campaignId: string,
    adSetId: string,
    platform: MockTrafficPlatform,
    fixture: MockAdFixture,
  ): Promise<void> {
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM ads WHERE adset_id = $1 AND platform_ad_id = $2 LIMIT 1`,
      [adSetId, fixture.platformAdId],
    );

    const baseMetrics = adLevelMetrics(
      platform,
      fixture.status,
      fixture.fatigueScore ?? 25,
    );
    const ctr = baseMetrics.ctr;

    if (existing[0]) {
      await query(
        `UPDATE ads SET
           workspace_id = $2,
           campaign_id = $3,
           platform = $4,
           name = $5,
           status = $6,
           creative_type = $7,
           creative_url = $8,
           creative_text = $9,
           fatigue_score = $10,
           fatigue_status = $11,
           spend = $12,
           impressions = $13,
           clicks = $14,
           ctr = $15,
           conversions = $16,
           frequency = $17,
           updated_at = NOW()
         WHERE id = $1`,
        [
          existing[0].id,
          workspaceId,
          campaignId,
          platform,
          fixture.name,
          this.toDbAdStatus(fixture.status),
          fixture.creativeType,
          fixture.creativeUrl,
          fixture.creativeText,
          fixture.fatigueScore ?? null,
          fixture.fatigueStatus ?? 'healthy',
          baseMetrics.spend,
          baseMetrics.impressions,
          baseMetrics.clicks,
          ctr,
          baseMetrics.conversions,
          baseMetrics.frequency,
        ],
      );
      return;
    }

    await query(
      `INSERT INTO ads (
         workspace_id, campaign_id, adset_id, platform, platform_ad_id, name, status,
         creative_type, creative_url, creative_text, fatigue_score, fatigue_status,
         spend, impressions, clicks, ctr, conversions, frequency
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        workspaceId,
        campaignId,
        adSetId,
        platform,
        fixture.platformAdId,
        fixture.name,
        this.toDbAdStatus(fixture.status),
        fixture.creativeType,
        fixture.creativeUrl,
        fixture.creativeText,
        fixture.fatigueScore ?? null,
        fixture.fatigueStatus ?? 'healthy',
        baseMetrics.spend,
        baseMetrics.impressions,
        baseMetrics.clicks,
        ctr,
        baseMetrics.conversions,
        baseMetrics.frequency,
      ],
    );
  }

  private async recordSyncJob(
    workspaceId: string,
    accountId: string,
    platform: MockTrafficPlatform,
    userId: string,
    campaignCount: number,
    adSetCount: number,
    adCount: number,
  ): Promise<void> {
    await query(
      `INSERT INTO sync_jobs (
         workspace_id, ad_account_id, platform, status, campaigns_synced,
         metrics_synced, error_count, started_at, finished_at, duration_ms, triggered_by
       ) VALUES ($1, $2, $3, 'completed', $4, $5, 0, NOW(), NOW(), 0, $6)`,
      [workspaceId, accountId, platform, campaignCount, campaignCount * 14 + adSetCount + adCount, userId],
    );
  }
}

/** Exported for unit tests — expected platform list when seeding all wiremock platforms. */
export const MOCK_TRAFFIC_ALL_PLATFORMS = ALL_PLATFORMS;

/** Exported for unit tests — deterministic counts per fully-seeded platform. */
export const MOCK_TRAFFIC_COUNTS_PER_PLATFORM = {
  campaigns: 2,
  adSets: 6,
  ads: 18,
} as const;
