import { query } from '../database/connection';
import type {
  IMockTrafficSeeder,
  MockTrafficPlatform,
  MockTrafficSeedOptions,
  MockTrafficSeedResult,
} from '../../application/ports/IMockTrafficSeeder';
import type { SyncedCampaignMetrics } from '../../application/ports/IPlatformSyncService';
import { writeCampaignMetrics } from './syncPersistence';

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
  meta: { platformAccountId: 'mock_meta_act_1001', name: 'QA Meta Ads Account' },
  google: { platformAccountId: 'mock_google_cid_2001', name: 'QA Google Ads Account' },
  tiktok: { platformAccountId: 'mock_tiktok_adv_3001', name: 'QA TikTok Ads Account' },
  snap: { platformAccountId: 'mock_snap_act_4001', name: 'QA Snapchat Ads Account' },
};

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

const META_AD_FATIGUE: Record<
  MockAdFixture['status'],
  { fatigueScore: number; fatigueStatus: MockAdFixture['fatigueStatus'] }
> = {
  active: { fatigueScore: 22, fatigueStatus: 'healthy' },
  paused: { fatigueScore: 52, fatigueStatus: 'warning' },
  archived: { fatigueScore: 85, fatigueStatus: 'critical' },
};

const AD_STATUS_CYCLE: MockAdFixture['status'][] = ['active', 'paused', 'archived'];

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

function buildAdSetFixtures(campaign: MockCampaignFixture): MockAdSetFixture[] {
  return [
    {
      platformAdSetId: `${campaign.platformCampaignId}_as_1`,
      name: `${campaign.name} - Ad Set 1`,
      status: 'active',
      dailyBudget: Math.round(campaign.dailyBudget * 0.55),
    },
    {
      platformAdSetId: `${campaign.platformCampaignId}_as_2`,
      name: `${campaign.name} - Ad Set 2`,
      status: 'paused',
      dailyBudget: Math.round(campaign.dailyBudget * 0.45),
    },
  ];
}

function buildAdFixtures(
  platform: MockTrafficPlatform,
  adSet: MockAdSetFixture,
): MockAdFixture[] {
  return AD_STATUS_CYCLE.map((status, index) => {
    const fatigue =
      platform === 'meta'
        ? META_AD_FATIGUE[status]
        : status === 'active'
          ? { fatigueScore: 20, fatigueStatus: 'healthy' as const }
          : status === 'paused'
            ? { fatigueScore: 45, fatigueStatus: 'warning' as const }
            : { fatigueScore: 70, fatigueStatus: 'critical' as const };

    return {
      platformAdId: `${adSet.platformAdSetId}_ad_${index + 1}`,
      name: `${adSet.name} - Creative ${index + 1} (${status})`,
      status,
      creativeType: index === 1 ? 'video' : 'image',
      creativeUrl: `https://cdn.adnexus.ai/mock/${platform}/${adSet.platformAdSetId}_${index + 1}.jpg`,
      creativeText: `QA mock creative for ${PLATFORM_LABELS[platform]} (${status})`,
      ...fatigue,
    };
  });
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
           last_synced_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [existing[0].id, fixture.name, JSON.stringify(metadata), fixture.platformAccountId],
      );
      return existing[0].id;
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO ad_accounts (workspace_id, platform, platform_account_id, account_id, name, status, metadata, last_synced_at)
       VALUES ($1, $2, $3, $3, $4, 'active', $5, NOW())
       RETURNING id`,
      [workspaceId, platform, fixture.platformAccountId, fixture.name, JSON.stringify(metadata)],
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

  /** Prod ads.status CHECK allows active/paused/draft — not archived. */
  private toDbAdStatus(status: MockAdFixture['status']): 'active' | 'paused' {
    return status === 'archived' ? 'paused' : status;
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

    const baseMetrics = {
      spend: fixture.status === 'active' ? 120 : fixture.status === 'paused' ? 45 : 12,
      impressions: fixture.status === 'active' ? 8200 : fixture.status === 'paused' ? 3100 : 900,
      clicks: fixture.status === 'active' ? 210 : fixture.status === 'paused' ? 62 : 14,
      conversions: fixture.status === 'active' ? 18 : fixture.status === 'paused' ? 5 : 1,
      frequency: fixture.fatigueScore != null ? 1.2 + fixture.fatigueScore / 100 : 1.5,
    };
    const ctr = baseMetrics.impressions > 0
      ? round((baseMetrics.clicks / baseMetrics.impressions) * 100)
      : 0;

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
  adSets: 4,
  ads: 12,
} as const;
