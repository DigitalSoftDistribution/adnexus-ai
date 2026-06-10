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

const ACCOUNT_FIXTURES: Record<MockTrafficPlatform, { platformAccountId: string; name: string }> = {
  meta: { platformAccountId: 'mock_meta_act_1001', name: 'QA Meta Ads Account' },
  google: { platformAccountId: 'mock_google_cid_2001', name: 'QA Google Ads Account' },
};

const CAMPAIGN_FIXTURES: Record<MockTrafficPlatform, MockCampaignFixture[]> = {
  meta: [
    {
      platformCampaignId: 'mock_meta_cmp_prospecting',
      name: 'QA Meta Prospecting - Advantage+',
      status: 'active',
      objective: 'sales',
      dailyBudget: 180,
      base: metric(1840, 124000, 3360, 185, 9.4, 1.8),
    },
    {
      platformCampaignId: 'mock_meta_cmp_retargeting',
      name: 'QA Meta Retargeting - Catalog',
      status: 'active',
      objective: 'sales',
      dailyBudget: 95,
      base: metric(760, 42000, 1540, 118, 6.7, 2.2),
    },
  ],
  google: [
    {
      platformCampaignId: 'mock_google_cmp_brand_search',
      name: 'QA Google Brand Search',
      status: 'active',
      objective: 'traffic',
      dailyBudget: 120,
      base: metric(620, 31500, 2180, 96, 5.8, 1.5),
    },
    {
      platformCampaignId: 'mock_google_cmp_pmax',
      name: 'QA Google Performance Max',
      status: 'paused',
      objective: 'sales',
      dailyBudget: 240,
      base: metric(2125, 168000, 4200, 210, 8.1, 1.4),
    },
  ],
};

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
    let metricsSeeded = 0;

    for (const platform of options.platforms) {
      const accountId = await this.upsertAccount(options.workspaceId, platform);
      accountIds.push(accountId);

      for (const fixture of CAMPAIGN_FIXTURES[platform]) {
        const metrics = applyVariant(fixture.base, options.variant);
        const campaignId = await this.upsertCampaign(accountId, platform, fixture, metrics);
        campaignsSeeded++;

        for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
          await writeCampaignMetrics(campaignId, isoDateDaysAgo(daysAgo), scaleDaily(metrics, 13 - daysAgo));
          metricsSeeded++;
        }
      }

      await this.recordSyncJob(options.workspaceId, accountId, platform, options.userId, CAMPAIGN_FIXTURES[platform].length);
    }

    return {
      workspaceId: options.workspaceId,
      accountsSeeded: accountIds.length,
      campaignsSeeded,
      metricsSeeded,
      platforms: options.platforms,
      accountIds,
    };
  }

  private async upsertAccount(workspaceId: string, platform: MockTrafficPlatform): Promise<string> {
    const fixture = ACCOUNT_FIXTURES[platform];
    const metadata = {
      accountName: fixture.name,
      mockTraffic: true,
      seededBy: 'mock-traffic-harness',
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
           last_synced_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [existing[0].id, fixture.name, JSON.stringify(metadata)],
      );
      return existing[0].id;
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO ad_accounts (workspace_id, platform, platform_account_id, name, status, metadata, last_synced_at)
       VALUES ($1, $2, $3, $4, 'active', $5, NOW())
       RETURNING id`,
      [workspaceId, platform, fixture.platformAccountId, fixture.name, JSON.stringify(metadata)],
    );
    return rows[0].id;
  }

  private async upsertCampaign(
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
      seededAt: new Date().toISOString(),
    };

    if (existing[0]) {
      await query(
        `UPDATE campaigns SET
           name = $2,
           status = $3,
           objective = $4,
           budget_type = 'daily',
           daily_budget = $5,
           lifetime_budget = NULL,
           spend = $6,
           impressions = $7,
           clicks = $8,
           ctr = $9,
           conversions = $10,
           cpa = $11,
           roas = $12,
           frequency = $13,
           cpm = $14,
           cpc = $15,
           platform_data = $16,
           updated_at = NOW()
         WHERE id = $1`,
        [
          existing[0].id,
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
         ad_account_id, platform_campaign_id, name, status, objective,
         budget_type, daily_budget, lifetime_budget, spend, impressions, clicks,
         ctr, conversions, cpa, roas, frequency, cpm, cpc, platform_data
       ) VALUES ($1, $2, $3, $4, $5, 'daily', $6, NULL, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id`,
      [
        accountId,
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

  private async recordSyncJob(
    workspaceId: string,
    accountId: string,
    platform: MockTrafficPlatform,
    userId: string,
    campaignCount: number,
  ): Promise<void> {
    await query(
      `INSERT INTO sync_jobs (
         workspace_id, ad_account_id, platform, status, campaigns_synced,
         metrics_synced, error_count, started_at, finished_at, duration_ms, triggered_by
       ) VALUES ($1, $2, $3, 'completed', $4, $5, 0, NOW(), NOW(), 0, $6)`,
      [workspaceId, accountId, platform, campaignCount, campaignCount * 14, userId],
    );
  }
}
