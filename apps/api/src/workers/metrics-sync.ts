// @ts-nocheck — unported worker, token types mismatch
import { Worker, Queue, Job } from 'bullmq';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { PlatformError } from '../lib/errors';
import type { Platform, AdAccount } from '../types';
import * as metaApi from '../services/meta-api';
import * as googleApi from '../services/google-api';
import * as tiktokApi from '../services/tiktok-api';
import * as snapApi from '../services/snap-api';
import {
  decryptOAuthTokenFromStorage,
  encryptOAuthTokenForStorage,
} from '../security/oauth-token-crypto';

// ─── Types ───────────────────────────────────────────────────

export type SyncType = 'full' | 'incremental';

interface SyncJobData {
  workspaceId: string;
  syncType: SyncType;
}

interface SyncResult {
  platform: Platform;
  accountId: string;
  campaignsUpdated: number;
  adsetsUpdated: number;
  adsUpdated: number;
  errors: string[];
  success: boolean;
}

interface CampaignInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
  cpm: number;
  cpc: number;
  video_views: number;
  video_p25: number;
  video_p50: number;
  video_p75: number;
  video_p100: number;
}

interface AdSetInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
}

interface AdInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
}

interface SyncSummary {
  accountsSynced: number;
  campaignsUpdated: number;
  adsetsUpdated: number;
  adsUpdated: number;
  errors: string[];
}

// ─── Redis Connection ────────────────────────────────────────

function getRedisConnection() {
  if (config.redis.url) {
    return { url: config.redis.url };
  }
  return { host: 'localhost', port: 6379 };
}

// ─── Queue ───────────────────────────────────────────────────

export const metricsSyncQueue = new Queue('metrics-sync', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 15000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ─── Worker ──────────────────────────────────────────────────

export const metricsSyncWorker = new Worker(
  'metrics-sync',
  async (job: Job<SyncJobData>) => {
    const { workspaceId, syncType } = job.data;
    console.log(`[Metrics Sync] ${syncType} sync started for workspace ${workspaceId}`);

    const summary: SyncSummary = {
      accountsSynced: 0,
      campaignsUpdated: 0,
      adsetsUpdated: 0,
      adsUpdated: 0,
      errors: [],
    };

    try {
      // 1. Fetch all connected ad accounts for the workspace
      const { data: accounts, error: accountsError } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'disconnected');

      if (accountsError) {
        throw new PlatformError('sync', `Failed to fetch ad accounts: ${accountsError.message}`);
      }

      if (!accounts || accounts.length === 0) {
        console.log(`[Metrics Sync] No connected accounts found for workspace ${workspaceId}`);
        await logAuditEvent(workspaceId, 'metrics_sync_complete', 'system', {
          sync_type: syncType,
          accounts_found: 0,
          result: 'no_accounts',
        });
        return summary;
      }

      console.log(`[Metrics Sync] Found ${accounts.length} account(s) for workspace ${workspaceId}`);

      // 2. Sync each account
      for (const account of accounts) {
        try {
          const result = await syncAccount(account);
          summary.accountsSynced++;
          summary.campaignsUpdated += result.campaignsUpdated;
          summary.adsetsUpdated += result.adsetsUpdated;
          summary.adsUpdated += result.adsUpdated;
          if (result.errors.length > 0) {
            summary.errors.push(...result.errors);
          }

          // Update last_synced_at in ad_accounts
          const { error: updateError } = await supabase
            .from('ad_accounts')
            .update({
              status: result.success ? 'active' : 'error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);

          if (updateError) {
            console.error(`[Metrics Sync] Failed to update ad_account ${account.id}:`, updateError.message);
          }

          // Rate limit breathing room between accounts
          await sleep(500);
        } catch (accountErr) {
          const errMsg = accountErr instanceof Error ? accountErr.message : String(accountErr);
          console.error(`[Metrics Sync] Error syncing account ${account.id} (${account.platform}):`, errMsg);
          summary.errors.push(`[${account.platform}] ${account.account_id}: ${errMsg}`);

          // Mark account as error if token refresh fails
          if (errMsg.includes('Token refresh') || errMsg.includes('unauthorized') || errMsg.includes('invalid')) {
            await supabase
              .from('ad_accounts')
              .update({ status: 'refresh_needed', updated_at: new Date().toISOString() })
              .eq('id', account.id);
          }
        }
      }

      // 4. Log sync results to audit_log
      await logAuditEvent(workspaceId, 'metrics_sync_complete', 'system', {
        sync_type: syncType,
        accounts_synced: summary.accountsSynced,
        campaigns_updated: summary.campaignsUpdated,
        adsets_updated: summary.adsetsUpdated,
        ads_updated: summary.adsUpdated,
        errors: summary.errors,
        success: summary.errors.length === 0,
      });

      console.log(
        `[Metrics Sync] ${syncType} sync complete for workspace ${workspaceId}: ` +
        `${summary.accountsSynced} accounts, ${summary.campaignsUpdated} campaigns, ` +
        `${summary.adsetsUpdated} adsets, ${summary.adsUpdated} ads`,
      );

      return summary;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Metrics Sync] Sync failed for workspace ${workspaceId}:`, errMsg);
      summary.errors.push(errMsg);

      await logAuditEvent(workspaceId, 'metrics_sync_failed', 'system', {
        sync_type: syncType,
        error: errMsg,
      });

      throw err;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
  },
);

// ─── Event Handlers ──────────────────────────────────────────

metricsSyncWorker.on('completed', (job) => {
  const result = job.returnvalue as SyncSummary | undefined;
  console.log(
    `[Metrics Sync] Job ${job.id} completed for workspace ${job.data.workspaceId}: ` +
    `${result?.accountsSynced ?? 0} accounts synced`,
  );
});

metricsSyncWorker.on('failed', (job, err) => {
  const jobId = job?.id ?? 'unknown';
  const workspaceId = job?.data?.workspaceId ?? 'unknown';
  console.error(`[Metrics Sync] Job ${jobId} failed for workspace ${workspaceId}:`, err.message);
});

// ─── Job Trigger ─────────────────────────────────────────────

export async function triggerMetricsSync(
  workspaceId: string,
  syncType: SyncType = 'incremental',
): Promise<string> {
  const job = await metricsSyncQueue.add(
    'metrics-sync',
    { workspaceId, syncType },
    { jobId: `sync-${workspaceId}-${Date.now()}` },
  );
  console.log(`[Metrics Sync] Queued ${syncType} sync for workspace ${workspaceId}, job ${job.id}`);
  return job.id as string;
}

// ─── Scheduled Sync ──────────────────────────────────────────

export async function scheduleMetricsSync(): Promise<void> {
  console.log('[Metrics Sync] Running scheduled sync for all active workspaces');

  try {
    // Get all workspaces that have at least one connected ad account
    const { data: workspaces, error } = await supabase
      .from('ad_accounts')
      .select('workspace_id')
      .neq('status', 'disconnected')
      .order('workspace_id');

    if (error) {
      throw new PlatformError('sync', `Failed to fetch workspaces: ${error.message}`);
    }

    if (!workspaces || workspaces.length === 0) {
      console.log('[Metrics Sync] No active workspaces found');
      return;
    }

    // Deduplicate workspace IDs
    const uniqueWorkspaceIds = [...new Set(workspaces.map((w) => w.workspace_id as string))];

    console.log(`[Metrics Sync] Queuing incremental sync for ${uniqueWorkspaceIds.length} workspace(s)`);

    // Queue incremental sync jobs for each workspace
    for (const workspaceId of uniqueWorkspaceIds) {
      try {
        await triggerMetricsSync(workspaceId, 'incremental');
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Metrics Sync] Failed to queue sync for workspace ${workspaceId}:`, errMsg);
      }
    }

    console.log('[Metrics Sync] Scheduled sync complete');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Metrics Sync] Scheduled sync failed:', errMsg);
    throw err;
  }
}

// ─── Account Router ──────────────────────────────────────────

async function syncAccount(account: AdAccount): Promise<SyncResult> {
  console.log(`[Metrics Sync] Syncing ${account.platform} account ${account.account_id}`);

  switch (account.platform) {
    case 'meta':
      return syncMetaAccount(account);
    case 'google':
      return syncGoogleAccount(account);
    case 'tiktok':
      return syncTikTokAccount(account);
    case 'snap':
      return syncSnapAccount(account);
    default:
      return {
        platform: account.platform,
        accountId: account.id,
        campaignsUpdated: 0,
        adsetsUpdated: 0,
        adsUpdated: 0,
        errors: [`Unknown platform: ${account.platform}`],
        success: false,
      };
  }
}

// ─── Meta Sync ───────────────────────────────────────────────

export async function syncMetaAccount(account: AdAccount): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'meta',
    accountId: account.id,
    campaignsUpdated: 0,
    adsetsUpdated: 0,
    adsUpdated: 0,
    errors: [],
    success: true,
  };

  try {
    // a. Ensure valid token
    const accessToken = await ensureValidToken(account);

    // Calculate date range: last 7 days for incremental, last 30 for full
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // b. Fetch campaigns from Meta
    const metaCampaigns = await metaApi.getMetaCampaigns(account.account_id, accessToken, 'all');
    console.log(`[Meta] Fetched ${metaCampaigns.length} campaigns for account ${account.account_id}`);

    if (metaCampaigns.length === 0) {
      return result;
    }

    // Upsert campaigns to local DB
    for (const mc of metaCampaigns) {
      try {
        // c. Fetch insights for each campaign
        const insights = await metaApi.getMetaInsights(mc.id, accessToken, dateStart, dateEnd);

        const campaignMetrics: CampaignInsights = {
          spend: parseFloat(insights.spend as string) || 0,
          impressions: parseInt(insights.impressions as string) || 0,
          clicks: parseInt(insights.clicks as string) || 0,
          ctr: parseFloat(insights.ctr as string) || 0,
          conversions: parseInt(insights.conversions as string) || 0,
          cpa: parseFloat(insights.cost_per_conversion as string) || 0,
          roas: 0,
          frequency: parseFloat(insights.frequency as string) || 0,
          reach: parseInt(insights.reach as string) || 0,
          cpm: parseFloat(insights.cpm as string) || 0,
          cpc: parseFloat(insights.cpc as string) || 0,
          video_views: 0,
          video_p25: 0,
          video_p50: 0,
          video_p75: 0,
          video_p100: 0,
        };

        // Compute ROAS from action_values
        const actionValues = insights.action_values as Array<{ action_type: string; value: string }> | undefined;
        if (actionValues) {
          const purchaseValue = actionValues.find((av) => av.action_type === 'omni_purchase')?.value ?? '0';
          campaignMetrics.roas = campaignMetrics.spend > 0 ? parseFloat(purchaseValue) / campaignMetrics.spend : 0;
        }

        // Normalize campaign data
        const normalized = metaApi.normalizeMetaCampaign(mc);

        // Upsert campaign
        const { data: campaignRecord, error: campaignError } = await supabase
          .from('campaigns')
          .upsert(
            {
              ad_account_id: account.id,
              platform_campaign_id: mc.id,
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              daily_budget: normalized.daily_budget,
              lifetime_budget: normalized.lifetime_budget,
              budget_type: normalized.budget_type,
              spend: campaignMetrics.spend,
              impressions: campaignMetrics.impressions,
              clicks: campaignMetrics.clicks,
              ctr: campaignMetrics.ctr,
              conversions: campaignMetrics.conversions,
              cpa: campaignMetrics.cpa,
              roas: campaignMetrics.roas,
              frequency: campaignMetrics.frequency,
              reach: campaignMetrics.reach,
              cpm: campaignMetrics.cpm,
              cpc: campaignMetrics.cpc,
              start_date: normalized.start_date,
              end_date: normalized.end_date,
              platform_data: mc as unknown as Record<string, unknown>,
            },
            { onConflict: 'ad_account_id,platform_campaign_id' },
          )
          .select()
          .single();

        if (campaignError) {
          console.error(`[Meta] Failed to upsert campaign ${mc.id}:`, campaignError.message);
          result.errors.push(`Campaign ${mc.id}: ${campaignError.message}`);
          continue;
        }

        result.campaignsUpdated++;

        // d. Fetch adsets for this campaign
        // Meta API: adsets are fetched at campaign level via /campaign_id/adsets
        const { data: metaAdsets } = await fetchMetaAdSets(mc.id, accessToken);
        if (metaAdsets && metaAdsets.length > 0) {
          for (const adset of metaAdsets) {
            try {
              await upsertAdSet(campaignRecord.id, adset);
              result.adsetsUpdated++;
            } catch (adsetErr) {
              const msg = adsetErr instanceof Error ? adsetErr.message : String(adsetErr);
              result.errors.push(`AdSet ${adset.id}: ${msg}`);
            }
          }
        }

        // e. Fetch ads for this campaign
        const { data: metaAds } = await fetchMetaAds(mc.id, accessToken);
        if (metaAds && metaAds.length > 0) {
          for (const ad of metaAds) {
            try {
              await upsertAd(campaignRecord.id, ad);
              result.adsUpdated++;
            } catch (adErr) {
              const msg = adErr instanceof Error ? adErr.message : String(adErr);
              result.errors.push(`Ad ${ad.id}: ${msg}`);
            }
          }
        }

        // Rate limit breathing room
        await sleep(200);
      } catch (campaignErr) {
        const msg = campaignErr instanceof Error ? campaignErr.message : String(campaignErr);
        console.error(`[Meta] Error processing campaign ${mc.id}:`, msg);
        result.errors.push(`Campaign ${mc.id}: ${msg}`);
      }
    }

    if (result.errors.length > 0) {
      console.warn(`[Meta] Account ${account.account_id} sync completed with ${result.errors.length} error(s)`);
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] Account ${account.account_id} sync failed:`, msg);
    result.errors.push(msg);
    result.success = false;
    return result;
  }
}

// ─── Google Sync ─────────────────────────────────────────────

export async function syncGoogleAccount(account: AdAccount): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'google',
    accountId: account.id,
    campaignsUpdated: 0,
    adsetsUpdated: 0,
    adsUpdated: 0,
    errors: [],
    success: true,
  };

  try {
    const accessToken = await ensureValidToken(account);

    // Date range
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Fetch campaigns
    const campaigns = await googleApi.fetchGoogleCampaigns(account.account_id, accessToken, { status: 'all' });
    console.log(`[Google] Fetched ${campaigns.length} campaigns for account ${account.account_id}`);

    if (campaigns.length === 0) {
      return result;
    }

    // Fetch insights for all campaigns
    const campaignIds = campaigns.map((c) => c.resource_name);
    const insights = await googleApi.fetchGoogleInsights(
      campaignIds,
      accessToken,
      { start: dateStart, end: dateEnd },
    );

    // Build insights map
    const insightsMap = new Map<string, googleApi.GoogleInsight>();
    for (const insight of insights) {
      insightsMap.set(insight.campaign_id, insight);
    }

    // Upsert campaigns
    for (const campaign of campaigns) {
      try {
        const campaignId = campaign.resource_name.match(/\/(\d+)$/)?.[1] ?? campaign.id;
        const insight = insightsMap.get(campaignId);

        const normalized = await googleApi.normalizeGoogleCampaign(campaign, insight ?? undefined);

        const { data: campaignRecord, error: upsertError } = await supabase
          .from('campaigns')
          .upsert(
            {
              ad_account_id: account.id,
              platform_campaign_id: campaignId,
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              daily_budget: normalized.daily_budget,
              lifetime_budget: normalized.lifetime_budget,
              budget_type: normalized.budget_type,
              spend: normalized.spend,
              impressions: normalized.impressions,
              clicks: normalized.clicks,
              ctr: normalized.ctr,
              conversions: normalized.conversions,
              cpa: normalized.cpa,
              roas: normalized.roas,
              frequency: normalized.frequency,
              reach: normalized.reach,
              cpm: normalized.cpm,
              cpc: normalized.cpc,
              start_date: normalized.start_date,
              end_date: normalized.end_date,
              platform_data: campaign as unknown as Record<string, unknown>,
            },
            { onConflict: 'ad_account_id,platform_campaign_id' },
          )
          .select()
          .single();

        if (upsertError) {
          result.errors.push(`Campaign ${campaignId}: ${upsertError.message}`);
          continue;
        }

        result.campaignsUpdated++;

        // Fetch ad groups for this campaign
        const adGroups = await googleApi.fetchGoogleAdGroups(campaign.resource_name, accessToken);
        for (const ag of adGroups) {
          try {
            const normalizedAg = await googleApi.normalizeGoogleAdGroup(ag);
            const adGroupId = ag.resource_name.match(/\/(\d+)$/)?.[1] ?? ag.id;
            const campaignUuid = campaignRecord.id;

            await supabase
              .from('adsets')
              .upsert(
                {
                  campaign_id: campaignUuid,
                  platform_adset_id: adGroupId,
                  name: normalizedAg.name,
                  status: normalizedAg.status,
                  bid_strategy: normalizedAg.bid_strategy,
                  bid_amount: normalizedAg.bid_amount,
                  targeting: normalizedAg.targeting,
                  platform_data: ag as unknown as Record<string, unknown>,
                },
                { onConflict: 'campaign_id,platform_adset_id' },
              );

            result.adsetsUpdated++;

            // Fetch ads for this ad group
            const ads = await googleApi.fetchGoogleAds(ag.resource_name, accessToken);
            for (const ad of ads) {
              try {
                const normalizedAd = await googleApi.normalizeGoogleAd(ad);
                const adId = ad.ad?.id ?? ad.resource_name.match(/\/(\d+)$/)?.[1] ?? ad.id;

                const { data: adsetRecord } = await supabase
                  .from('adsets')
                  .select('id')
                  .eq('campaign_id', campaignUuid)
                  .eq('platform_adset_id', adGroupId)
                  .single();

                if (adsetRecord) {
                  await supabase
                    .from('ads')
                    .upsert(
                      {
                        adset_id: adsetRecord.id,
                        platform_ad_id: adId,
                        name: normalizedAd.name,
                        status: normalizedAd.status,
                        creative_type: normalizedAd.creative_type,
                        creative_url: normalizedAd.creative_url,
                        creative_text: normalizedAd.creative_text,
                        platform_data: ad as unknown as Record<string, unknown>,
                      },
                      { onConflict: 'adset_id,platform_ad_id' },
                    );

                  result.adsUpdated++;
                }
              } catch (adErr) {
                const msg = adErr instanceof Error ? adErr.message : String(adErr);
                result.errors.push(`Ad ${ad.id}: ${msg}`);
              }
            }
          } catch (agErr) {
            const msg = agErr instanceof Error ? agErr.message : String(agErr);
            result.errors.push(`AdGroup ${ag.id}: ${msg}`);
          }
        }
      } catch (campaignErr) {
        const msg = campaignErr instanceof Error ? campaignErr.message : String(campaignErr);
        result.errors.push(`Campaign ${campaign.id}: ${msg}`);
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Google] Account ${account.account_id} sync failed:`, msg);
    result.errors.push(msg);
    result.success = false;
    return result;
  }
}

// ─── TikTok Sync ─────────────────────────────────────────────

export async function syncTikTokAccount(account: AdAccount): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'tiktok',
    accountId: account.id,
    campaignsUpdated: 0,
    adsetsUpdated: 0,
    adsUpdated: 0,
    errors: [],
    success: true,
  };

  try {
    const accessToken = await ensureValidToken(account);
    const advertiserId = account.account_id;

    // Date range
    const dateEnd = new Date().toISOString().slice(0, 10);
    const dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Fetch campaigns
    const campaigns = await tiktokApi.fetchTikTokCampaigns(advertiserId, accessToken, { status: 'all' });
    console.log(`[TikTok] Fetched ${campaigns.length} campaigns for advertiser ${advertiserId}`);

    if (campaigns.length === 0) {
      return result;
    }

    // Fetch insights
    const campaignIds = campaigns.map((c) => c.campaign_id);
    const insights = await tiktokApi.fetchTikTokInsights(campaignIds, accessToken, advertiserId, {
      start: dateStart,
      end: dateEnd,
    });

    const insightsMap = new Map<string, tiktokApi.TikTokInsight>();
    for (const insight of insights) {
      insightsMap.set(insight.campaign_id, insight);
    }

    // Upsert campaigns
    for (const campaign of campaigns) {
      try {
        const insight = insightsMap.get(campaign.campaign_id);
        const normalized = await tiktokApi.normalizeTikTokCampaign(campaign, insight ?? undefined);

        const { data: campaignRecord, error: upsertError } = await supabase
          .from('campaigns')
          .upsert(
            {
              ad_account_id: account.id,
              platform_campaign_id: campaign.campaign_id,
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              daily_budget: normalized.daily_budget,
              lifetime_budget: normalized.lifetime_budget,
              budget_type: normalized.budget_type,
              spend: normalized.spend,
              impressions: normalized.impressions,
              clicks: normalized.clicks,
              ctr: normalized.ctr,
              conversions: normalized.conversions,
              cpa: normalized.cpa,
              roas: normalized.roas,
              frequency: normalized.frequency,
              reach: normalized.reach,
              cpm: normalized.cpm,
              cpc: normalized.cpc,
              start_date: normalized.start_date,
              end_date: normalized.end_date,
              platform_data: campaign as unknown as Record<string, unknown>,
            },
            { onConflict: 'ad_account_id,platform_campaign_id' },
          )
          .select()
          .single();

        if (upsertError) {
          result.errors.push(`Campaign ${campaign.campaign_id}: ${upsertError.message}`);
          continue;
        }

        result.campaignsUpdated++;

        // Fetch ad groups
        const adGroups = await tiktokApi.fetchTikTokAdGroups(campaign.campaign_id, accessToken, advertiserId);
        for (const ag of adGroups) {
          try {
            const normalizedAg = await tiktokApi.normalizeTikTokAdGroup(ag);

            await supabase
              .from('adsets')
              .upsert(
                {
                  campaign_id: campaignRecord.id,
                  platform_adset_id: ag.adgroup_id,
                  name: normalizedAg.name,
                  status: normalizedAg.status,
                  daily_budget: normalizedAg.daily_budget,
                  bid_strategy: normalizedAg.bid_strategy,
                  bid_amount: normalizedAg.bid_amount,
                  targeting: normalizedAg.targeting,
                  platform_data: ag as unknown as Record<string, unknown>,
                },
                { onConflict: 'campaign_id,platform_adset_id' },
              );

            result.adsetsUpdated++;

            // Fetch ads for this ad group
            const ads = await tiktokApi.fetchTikTokAds(ag.adgroup_id, accessToken, advertiserId);
            for (const ad of ads) {
              try {
                const normalizedAd = await tiktokApi.normalizeTikTokAd(ad);

                const { data: adsetRecord } = await supabase
                  .from('adsets')
                  .select('id')
                  .eq('campaign_id', campaignRecord.id)
                  .eq('platform_adset_id', ag.adgroup_id)
                  .single();

                if (adsetRecord) {
                  await supabase
                    .from('ads')
                    .upsert(
                      {
                        adset_id: adsetRecord.id,
                        platform_ad_id: ad.ad_id,
                        name: normalizedAd.name,
                        status: normalizedAd.status,
                        creative_type: normalizedAd.creative_type,
                        creative_url: normalizedAd.creative_url,
                        creative_text: normalizedAd.creative_text,
                        platform_data: ad as unknown as Record<string, unknown>,
                      },
                      { onConflict: 'adset_id,platform_ad_id' },
                    );

                  result.adsUpdated++;
                }
              } catch (adErr) {
                const msg = adErr instanceof Error ? adErr.message : String(adErr);
                result.errors.push(`Ad ${ad.ad_id}: ${msg}`);
              }
            }
          } catch (agErr) {
            const msg = agErr instanceof Error ? agErr.message : String(agErr);
            result.errors.push(`AdGroup ${ag.adgroup_id}: ${msg}`);
          }
        }
      } catch (campaignErr) {
        const msg = campaignErr instanceof Error ? campaignErr.message : String(campaignErr);
        result.errors.push(`Campaign ${campaign.campaign_id}: ${msg}`);
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[TikTok] Account ${account.account_id} sync failed:`, msg);
    result.errors.push(msg);
    result.success = false;
    return result;
  }
}

// ─── Snap Sync ───────────────────────────────────────────────

export async function syncSnapAccount(account: AdAccount): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'snap',
    accountId: account.id,
    campaignsUpdated: 0,
    adsetsUpdated: 0,
    adsUpdated: 0,
    errors: [],
    success: true,
  };

  try {
    const accessToken = await ensureValidToken(account);
    const adAccountId = account.account_id;

    // Date range
    const dateEnd = new Date().toISOString();
    const dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch campaigns
    const campaigns = await snapApi.fetchSnapCampaigns(adAccountId, accessToken, { status: 'all' });
    console.log(`[Snap] Fetched ${campaigns.length} campaigns for account ${adAccountId}`);

    if (campaigns.length === 0) {
      return result;
    }

    // Fetch stats for all campaigns
    const campaignIds = campaigns.map((c) => c.id);
    const stats = await snapApi.fetchSnapCampaignStats(
      campaignIds,
      accessToken,
      { startDate: dateStart, endDate: dateEnd },
      'TOTAL',
    );

    const statsMap = new Map<string, snapApi.SnapStats>();
    for (const stat of stats) {
      statsMap.set(stat.id, stat);
    }

    // Upsert campaigns
    for (const campaign of campaigns) {
      try {
        const stat = statsMap.get(campaign.id);
        const normalized = await snapApi.normalizeSnapCampaign(campaign, stat ?? undefined);

        const { data: campaignRecord, error: upsertError } = await supabase
          .from('campaigns')
          .upsert(
            {
              ad_account_id: account.id,
              platform_campaign_id: campaign.id,
              name: normalized.name,
              status: normalized.status,
              objective: normalized.objective,
              daily_budget: normalized.daily_budget,
              lifetime_budget: normalized.lifetime_budget,
              budget_type: normalized.budget_type,
              spend: normalized.spend,
              impressions: normalized.impressions,
              clicks: normalized.clicks,
              ctr: normalized.ctr,
              conversions: normalized.conversions,
              cpa: normalized.cpa,
              roas: normalized.roas,
              frequency: normalized.frequency,
              reach: normalized.reach,
              cpm: normalized.cpm,
              cpc: normalized.cpc,
              start_date: normalized.start_date,
              end_date: normalized.end_date,
              platform_data: campaign as unknown as Record<string, unknown>,
            },
            { onConflict: 'ad_account_id,platform_campaign_id' },
          )
          .select()
          .single();

        if (upsertError) {
          result.errors.push(`Campaign ${campaign.id}: ${upsertError.message}`);
          continue;
        }

        result.campaignsUpdated++;

        // Fetch ad squads (adsets)
        const adSquads = await snapApi.fetchSnapAdSquads(campaign.id, accessToken);
        for (const aq of adSquads) {
          try {
            const normalizedAq = await snapApi.normalizeSnapAdSquad(aq);

            await supabase
              .from('adsets')
              .upsert(
                {
                  campaign_id: campaignRecord.id,
                  platform_adset_id: aq.id,
                  name: normalizedAq.name,
                  status: normalizedAq.status,
                  daily_budget: normalizedAq.daily_budget,
                  bid_strategy: normalizedAq.bid_strategy,
                  bid_amount: normalizedAq.bid_amount,
                  targeting: normalizedAq.targeting,
                  platform_data: aq as unknown as Record<string, unknown>,
                },
                { onConflict: 'campaign_id,platform_adset_id' },
              );

            result.adsetsUpdated++;

            // Fetch ads for this ad squad
            const ads = await snapApi.fetchSnapAds(aq.id, accessToken);
            for (const ad of ads) {
              try {
                const normalizedAd = await snapApi.normalizeSnapAd(ad);

                const { data: adsetRecord } = await supabase
                  .from('adsets')
                  .select('id')
                  .eq('campaign_id', campaignRecord.id)
                  .eq('platform_adset_id', aq.id)
                  .single();

                if (adsetRecord) {
                  await supabase
                    .from('ads')
                    .upsert(
                      {
                        adset_id: adsetRecord.id,
                        platform_ad_id: ad.id,
                        name: normalizedAd.name,
                        status: normalizedAd.status,
                        creative_type: normalizedAd.creative_type,
                        platform_data: ad as unknown as Record<string, unknown>,
                      },
                      { onConflict: 'adset_id,platform_ad_id' },
                    );

                  result.adsUpdated++;
                }
              } catch (adErr) {
                const msg = adErr instanceof Error ? adErr.message : String(adErr);
                result.errors.push(`Ad ${ad.id}: ${msg}`);
              }
            }
          } catch (aqErr) {
            const msg = aqErr instanceof Error ? aqErr.message : String(aqErr);
            result.errors.push(`AdSquad ${aq.id}: ${msg}`);
          }
        }
      } catch (campaignErr) {
        const msg = campaignErr instanceof Error ? campaignErr.message : String(campaignErr);
        result.errors.push(`Campaign ${campaign.id}: ${msg}`);
      }
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Snap] Account ${account.account_id} sync failed:`, msg);
    result.errors.push(msg);
    result.success = false;
    return result;
  }
}

// ─── Database Update Functions ───────────────────────────────

export async function updateCampaignMetrics(
  campaignId: string,
  insights: CampaignInsights,
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({
      spend: insights.spend,
      impressions: insights.impressions,
      clicks: insights.clicks,
      ctr: insights.ctr,
      conversions: insights.conversions,
      cpa: insights.cpa,
      roas: insights.roas,
      frequency: insights.frequency,
      reach: insights.reach,
      cpm: insights.cpm,
      cpc: insights.cpc,
      video_views: insights.video_views,
      video_p25: insights.video_p25,
      video_p50: insights.video_p50,
      video_p75: insights.video_p75,
      video_p100: insights.video_p100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) {
    throw new PlatformError('db', `Failed to update campaign metrics: ${error.message}`);
  }
}

export async function updateAdsetMetrics(
  adsetId: string,
  insights: AdSetInsights,
): Promise<void> {
  const { error } = await supabase
    .from('adsets')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', adsetId);

  if (error) {
    throw new PlatformError('db', `Failed to update adset metrics: ${error.message}`);
  }
}

export async function updateAdMetrics(
  adId: string,
  insights: AdInsights,
): Promise<void> {
  const { error } = await supabase
    .from('ads')
    .update({
      spend: insights.spend,
      impressions: insights.impressions,
      clicks: insights.clicks,
      ctr: insights.ctr,
      conversions: insights.conversions,
      cpa: insights.cpa,
      roas: insights.roas,
      frequency: insights.frequency,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adId);

  if (error) {
    throw new PlatformError('db', `Failed to update ad metrics: ${error.message}`);
  }
}

// ─── Token Refresh ───────────────────────────────────────────

export async function ensureValidToken(account: AdAccount): Promise<string> {
  // Get the latest token info from the database
  const { data: accountData, error } = await supabase
    .from('ad_accounts')
    .select('oauth_token, refresh_token, token_expires_at, metadata')
    .eq('id', account.id)
    .single();

  if (error || !accountData) {
    throw new PlatformError(account.platform, `Failed to fetch token for account ${account.id}: ${error?.message}`);
  }

  const expiresAt = accountData.token_expires_at ? new Date(accountData.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000; // 5-minute buffer

  const oauthToken = decryptOAuthTokenFromStorage(accountData.oauth_token);
  const refreshToken = decryptOAuthTokenFromStorage(accountData.refresh_token);

  if (!isExpired && oauthToken) {
    return oauthToken;
  }

  // Token is expired or about to expire — refresh it
  console.log(`[Metrics Sync] Refreshing token for ${account.platform} account ${account.account_id}`);

  try {
    let newToken: string;
    let newRefreshToken: string | undefined;
    let newExpiresAt: Date;

    switch (account.platform) {
      case 'meta': {
        if (!refreshToken) {
          throw new PlatformError('meta', 'No refresh token available');
        }
        const refreshed = await metaApi.refreshMetaToken(refreshToken);
        newToken = refreshed.access_token;
        newExpiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000);
        break;
      }
      case 'google': {
        if (!refreshToken) {
          throw new PlatformError('google', 'No refresh token available');
        }
        const tokenData = await googleApi.handleGoogleCallback(refreshToken, account.workspace_id);
        newToken = (tokenData as unknown as Record<string, unknown>).metadata?.access_token as string ?? '';
        newRefreshToken = (tokenData as unknown as Record<string, unknown>).metadata?.refresh_token as string | undefined;
        newExpiresAt = (tokenData as unknown as Record<string, unknown>).token_expires_at ? new Date((tokenData as unknown as Record<string, unknown>).token_expires_at as string) : new Date(Date.now() + 3600 * 1000);
        break;
      }
      case 'tiktok': {
        if (!accountData.refresh_token) {
          throw new PlatformError('tiktok', 'No refresh token available');
        }
        const tiktokRefreshed = await tiktokApi.refreshTikTokToken(accountData.refresh_token);
        newToken = tiktokRefreshed.accessToken;
        newRefreshToken = tiktokRefreshed.refreshToken;
        newExpiresAt = tiktokRefreshed.expiresAt;
        break;
      }
      case 'snap': {
        const refreshToken = accountData.metadata?.refresh_token as string | undefined;
        if (!refreshToken) {
          throw new PlatformError('snap', 'No refresh token available');
        }
        const snapRefreshed = await snapApi.refreshSnapToken(refreshToken);
        newToken = snapRefreshed.accessToken;
        newExpiresAt = snapRefreshed.expiresAt;
        break;
      }
      default:
        throw new PlatformError(account.platform, `Token refresh not implemented for platform: ${account.platform}`);
    }

    // Store the new token (encrypted at rest for Meta/Google)
    const updateData: Record<string, unknown> = {
      oauth_token:
        account.platform === 'meta' || account.platform === 'google'
          ? encryptOAuthTokenForStorage(newToken)
          : newToken,
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (newRefreshToken) {
      updateData.refresh_token =
        account.platform === 'meta' || account.platform === 'google'
          ? encryptOAuthTokenForStorage(newRefreshToken)
          : newRefreshToken;
    }

    const { error: updateError } = await supabase
      .from('ad_accounts')
      .update(updateData)
      .eq('id', account.id);

    if (updateError) {
      console.error(`[Metrics Sync] Failed to store refreshed token for account ${account.id}:`, updateError.message);
    }

    console.log(`[Metrics Sync] Token refreshed for ${account.platform} account ${account.account_id}`);
    return newToken;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Metrics Sync] Token refresh failed for ${account.platform} account ${account.account_id}:`, msg);
    throw new PlatformError(account.platform, `Token refresh failed: ${msg}`);
  }
}

// ─── Rate Limit Handling ─────────────────────────────────────

export async function handleRateLimit(platform: string, retryAfter?: number): Promise<void> {
  const delayMs = retryAfter ? retryAfter * 1000 : 60000; // Default 60 seconds
  console.log(`[Metrics Sync] Rate limited by ${platform}. Sleeping for ${delayMs}ms`);
  await sleep(delayMs);
}

// ─── Graceful Shutdown ───────────────────────────────────────

export async function shutdownMetricsSync(): Promise<void> {
  console.log('[Metrics Sync] Shutting down worker...');
  await metricsSyncWorker.close();
  await metricsSyncQueue.close();
  console.log('[Metrics Sync] Worker shut down complete');
}

// ─── Helpers ─────────────────────────────────────────────────

async function logAuditEvent(
  workspaceId: string,
  action: string,
  actorType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: actorType,
      action,
      action_category: 'api_call',
      details,
      source: 'metrics_sync_worker',
    });

    if (error) {
      console.error('[Metrics Sync] Failed to log audit event:', error.message);
    }
  } catch (err) {
    console.error('[Metrics Sync] Audit log error:', err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Meta-Specific Helpers ───────────────────────────────────

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  targeting?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative?: Record<string, unknown>;
  [key: string]: unknown;
}

async function fetchMetaAdSets(campaignId: string, accessToken: string): Promise<{ data: MetaAdSet[] }> {
  try {
    const axios = (await import('axios')).default;
    const { data } = await axios.get(
      `https://graph.facebook.com/${config.meta.apiVersion}/${campaignId}/adsets`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,bid_strategy,targeting',
          limit: 100,
        },
      },
    );
    return { data: data.data ?? [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] Failed to fetch adsets for campaign ${campaignId}:`, msg);
    return { data: [] };
  }
}

async function fetchMetaAds(campaignId: string, accessToken: string): Promise<{ data: MetaAd[] }> {
  try {
    const axios = (await import('axios')).default;
    const { data } = await axios.get(
      `https://graph.facebook.com/${config.meta.apiVersion}/${campaignId}/ads`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,adset_id,creative',
          limit: 100,
        },
      },
    );
    return { data: data.data ?? [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] Failed to fetch ads for campaign ${campaignId}:`, msg);
    return { data: [] };
  }
}

async function upsertAdSet(campaignId: string, adset: MetaAdSet): Promise<void> {
  const { error } = await supabase.from('adsets').upsert(
    {
      campaign_id: campaignId,
      platform_adset_id: adset.id,
      name: adset.name,
      status: mapMetaStatus(adset.status),
      daily_budget: adset.daily_budget ? parseInt(adset.daily_budget) / 100 : undefined,
      bid_strategy: adset.bid_strategy,
      targeting: adset.targeting ?? {},
      platform_data: adset,
    },
    { onConflict: 'campaign_id,platform_adset_id' },
  );

  if (error) {
    throw new PlatformError('db', `Failed to upsert adset ${adset.id}: ${error.message}`);
  }
}

async function upsertAd(campaignId: string, ad: MetaAd): Promise<void> {
  // Find the adset_id in our database
  const { data: adsetRecord, error: adsetError } = await supabase
    .from('adsets')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('platform_adset_id', ad.adset_id)
    .single();

  if (adsetError || !adsetRecord) {
    console.warn(`[Meta] Adset not found for ad ${ad.id}, campaign ${campaignId}`);
    return;
  }

  const { error } = await supabase.from('ads').upsert(
    {
      adset_id: adsetRecord.id,
      platform_ad_id: ad.id,
      name: ad.name,
      status: mapMetaStatus(ad.status),
      platform_data: ad,
    },
    { onConflict: 'adset_id,platform_ad_id' },
  );

  if (error) {
    throw new PlatformError('db', `Failed to upsert ad ${ad.id}: ${error.message}`);
  }
}

function mapMetaStatus(status: string): 'active' | 'paused' | 'draft' | 'error' {
  const statusMap: Record<string, 'active' | 'paused' | 'draft' | 'error'> = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'paused',
    DELETED: 'draft',
    CAMPAIGN_STATUS_ENABLE: 'active',
    CAMPAIGN_STATUS_DISABLE: 'paused',
    ADGROUP_STATUS_ENABLE: 'active',
    ADGROUP_STATUS_DISABLE: 'paused',
    AD_STATUS_ENABLE: 'active',
    AD_STATUS_DISABLE: 'paused',
  };
  return statusMap[status] ?? 'paused';
}
