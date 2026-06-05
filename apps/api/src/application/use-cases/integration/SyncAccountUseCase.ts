import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';
import type { ISyncJobRepository, SyncJob, SyncJobError } from '../../../domain/repositories/ISyncJobRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IPlatformSyncService, SyncedCampaign } from '../../ports/IPlatformSyncService';
import type { Platform, CampaignStatus } from '../../../domain/entities/Campaign';
import { CampaignUpdatedEvent } from '../../../domain/events/DomainEvent';
import { Result, ok, err, ForbiddenError, NotFoundError, ConflictError } from '../../../domain/value-objects/Result';

export interface SyncAccountInput {
  workspaceId: string;
  adAccountId: string;
  userRole: string;
  userId: string;
}

export interface SyncAccountOutput {
  job: SyncJob;
  liveSynced: boolean;
}

const WRITE_ROLES = ['owner', 'admin', 'editor'];
const VALID_STATUSES: CampaignStatus[] = ['active', 'paused', 'archived', 'draft', 'pending', 'deleted'];

/**
 * Imports all campaigns + metrics for one ad account from the platform.
 *
 * Records a sync_job (running -> completed/partial/failed), upserts campaigns by
 * platform_campaign_id, writes per-day campaign_metrics, stamps
 * ad_accounts.last_synced_at, and emits a CampaignUpdatedEvent so the dashboard
 * refreshes. Collects non-fatal per-campaign errors instead of aborting.
 */
export class SyncAccountUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly eventBus: IEventBus,
    private readonly platformSync: IPlatformSyncService,
    /** Writes a per-day metrics row; injected so the use-case stays DB-agnostic. */
    private readonly writeMetrics: (campaignId: string, date: string, m: SyncedCampaign['metrics']) => Promise<void>,
    /** Stamps ad_accounts.last_synced_at. */
    private readonly stampSynced: (adAccountId: string) => Promise<void>,
    /**
     * Optional: persists a campaign's ad sets + ads. When omitted, the sync
     * imports campaigns + metrics only (ad sets/ads are skipped).
     */
    private readonly writeAdSets?: (
      workspaceId: string,
      campaignId: string,
      platform: Platform,
      adSets: NonNullable<SyncedCampaign['adSets']>,
    ) => Promise<{ adSets: number; ads: number }>,
  ) {}

  async execute(input: SyncAccountInput): Promise<Result<SyncAccountOutput>> {
    if (!WRITE_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to sync accounts'));
    }

    const account = await this.adAccountRepo.findByIdAndWorkspace(input.adAccountId, input.workspaceId);
    if (!account) {
      return err(new NotFoundError('Ad account'));
    }

    // Reject overlapping syncs for the same account so concurrent "Sync now"
    // clicks don't run duplicate imports or leave multiple `running` rows.
    const inFlight = await this.syncJobRepo.findRunningForAccount(account.id);
    if (inFlight) {
      return err(new ConflictError('A sync is already running for this account'));
    }

    const platform = account.platform as Platform;
    const job = await this.syncJobRepo.start({
      workspaceId: input.workspaceId,
      adAccountId: account.id,
      platform,
      triggeredBy: input.userId,
    });

    if (!this.platformSync.supports(platform)) {
      const finished = await this.syncJobRepo.finish(job.id, {
        status: 'completed',
        campaignsSynced: 0,
        metricsSynced: 0,
        errors: [],
      });
      return ok({ job: finished ?? job, liveSynced: false });
    }

    // From here on a throw must not leave the job stuck in `running`: any
    // unexpected failure (network, Meta error, timeout) is recorded as a failed
    // job before returning so the UI history never shows a perpetual sync.
    try {
      return await this.runSync(input, account, platform, job);
    } catch (e) {
      const finished = await this.syncJobRepo
        .finish(job.id, {
          status: 'failed',
          campaignsSynced: 0,
          metricsSynced: 0,
          errors: [{ scope: 'account', scopeId: account.platformAccountId, message: (e as Error).message }],
        })
        .catch(() => null);
      return ok({ job: finished ?? job, liveSynced: false });
    }
  }

  private async runSync(
    input: SyncAccountInput,
    account: AdAccount,
    platform: Platform,
    job: SyncJob,
  ): Promise<Result<SyncAccountOutput>> {
    const result = await this.platformSync.syncAccount({
      platform,
      adAccountId: account.id,
      platformAccountId: account.platformAccountId,
    });

    // Not syncable (no token / unsupported) — record a no-op completed job.
    if (!result) {
      const finished = await this.syncJobRepo.finish(job.id, {
        status: 'completed',
        campaignsSynced: 0,
        metricsSynced: 0,
        errors: [],
      });
      return ok({ job: finished ?? job, liveSynced: false });
    }

    const errors: SyncJobError[] = [...result.errors];
    const today = new Date().toISOString().slice(0, 10);
    let campaignsSynced = 0;
    let metricsSynced = 0;

    for (const c of result.campaigns) {
      try {
        const status =
          c.status && VALID_STATUSES.includes(c.status as CampaignStatus)
            ? (c.status as CampaignStatus)
            : 'paused';

        // findByPlatformCampaignId matches on the Meta campaign id alone, which
        // is not workspace-scoped. Only treat it as "the same campaign" when it
        // belongs to the account being synced; otherwise create a new row so we
        // never overwrite another workspace's campaign with this account's data.
        const matched = await this.campaignRepo.findByPlatformCampaignId(c.platformCampaignId);
        const existing = matched && matched.adAccountId === account.id ? matched : null;
        let campaignId: string;

        if (existing) {
          await this.campaignRepo.update(existing.id, {
            name: c.name,
            status,
            objective: (c.objective ?? null) as never,
            dailyBudget: c.dailyBudget ?? null,
            lifetimeBudget: c.lifetimeBudget ?? null,
            budgetType: c.budgetType ?? null,
            startDate: c.startDate ?? null,
            endDate: c.endDate ?? null,
            spend: c.metrics.spend,
            impressions: c.metrics.impressions,
            clicks: c.metrics.clicks,
            ctr: c.metrics.ctr,
            conversions: c.metrics.conversions,
            cpa: c.metrics.cpa,
            roas: c.metrics.roas,
            frequency: c.metrics.frequency,
            cpm: c.metrics.cpm,
            cpc: c.metrics.cpc,
          });
          campaignId = existing.id;
        } else {
          const created = await this.campaignRepo.create({
            workspaceId: input.workspaceId,
            adAccountId: account.id,
            platform,
            platformCampaignId: c.platformCampaignId,
            name: c.name,
            status,
            objective: (c.objective ?? null) as never,
            budget: null,
            budgetType: c.budgetType ?? null,
            dailyBudget: c.dailyBudget ?? null,
            lifetimeBudget: c.lifetimeBudget ?? null,
            spend: c.metrics.spend,
            impressions: c.metrics.impressions,
            clicks: c.metrics.clicks,
            ctr: c.metrics.ctr,
            conversions: c.metrics.conversions,
            cpa: c.metrics.cpa,
            roas: c.metrics.roas,
            frequency: c.metrics.frequency,
            cpm: c.metrics.cpm,
            cpc: c.metrics.cpc,
            startDate: c.startDate ?? null,
            endDate: c.endDate ?? null,
            platformData: null,
            leadFormId: null,
          });
          campaignId = created.id;
        }

        campaignsSynced++;

        try {
          await this.writeMetrics(campaignId, today, c.metrics);
          metricsSynced++;
        } catch (e) {
          errors.push({ scope: 'metrics', scopeId: c.platformCampaignId, message: (e as Error).message });
        }

        if (this.writeAdSets && c.adSets && c.adSets.length > 0) {
          try {
            await this.writeAdSets(input.workspaceId, campaignId, platform, c.adSets);
          } catch (e) {
            errors.push({ scope: 'adset', scopeId: c.platformCampaignId, message: (e as Error).message });
          }
        }
      } catch (e) {
        errors.push({ scope: 'campaign', scopeId: c.platformCampaignId, message: (e as Error).message });
      }
    }

    const status = errors.length === 0 ? 'completed' : campaignsSynced > 0 ? 'partial' : 'failed';

    // Only stamp last_synced_at when at least one campaign actually imported, so
    // a fully failed run does not show a fresh "last synced" in the UI.
    if (campaignsSynced > 0) {
      await this.stampSynced(account.id).catch(() => undefined);
    }

    const finished = await this.syncJobRepo.finish(job.id, {
      status,
      campaignsSynced,
      metricsSynced,
      errors,
    });

    // Only notify when something changed. The account UUID is passed as the
    // event's accountId (not a campaign id); the payload carries accountSync so
    // consumers refresh list/summary rather than a single campaign.
    if (campaignsSynced > 0) {
      await this.eventBus.publish(
        new CampaignUpdatedEvent(account.id, input.workspaceId, {
          accountSync: true,
          adAccountId: account.id,
          campaignsSynced,
        }),
      );
    }

    // liveSynced reflects whether real data was persisted, so callers can tell a
    // successful import from a no-op or failed run.
    return ok({ job: finished ?? job, liveSynced: campaignsSynced > 0 });
  }
}
