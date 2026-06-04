import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { ISyncJobRepository, SyncJob, SyncJobError } from '../../../domain/repositories/ISyncJobRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IPlatformSyncService, SyncedCampaign } from '../../ports/IPlatformSyncService';
import type { Platform, CampaignStatus } from '../../../domain/entities/Campaign';
import { CampaignUpdatedEvent } from '../../../domain/events/DomainEvent';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

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
  ) {}

  async execute(input: SyncAccountInput): Promise<Result<SyncAccountOutput>> {
    if (!WRITE_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to sync accounts'));
    }

    const account = await this.adAccountRepo.findByIdAndWorkspace(input.adAccountId, input.workspaceId);
    if (!account) {
      return err(new NotFoundError('Ad account'));
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

        const existing = await this.campaignRepo.findByPlatformCampaignId(c.platformCampaignId);
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
      } catch (e) {
        errors.push({ scope: 'campaign', scopeId: c.platformCampaignId, message: (e as Error).message });
      }
    }

    await this.stampSynced(account.id).catch(() => undefined);

    const status = errors.length === 0 ? 'completed' : campaignsSynced > 0 ? 'partial' : 'failed';
    const finished = await this.syncJobRepo.finish(job.id, {
      status,
      campaignsSynced,
      metricsSynced,
      errors,
    });

    await this.eventBus.publish(
      new CampaignUpdatedEvent(account.id, input.workspaceId, { accountSync: true, campaignsSynced }),
    );

    return ok({ job: finished ?? job, liveSynced: true });
  }
}
