import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { ICampaignHistoryRepository } from '../../../domain/repositories/ICampaignHistoryRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IPlatformSyncService } from '../../ports/IPlatformSyncService';
import { CampaignUpdatedEvent } from '../../../domain/events/DomainEvent';
import type { Campaign, CampaignStatus } from '../../../domain/entities/Campaign';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface SyncCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  userId: string;
  userName?: string | null;
}

const VALID_STATUSES: CampaignStatus[] = ['active', 'paused', 'archived', 'draft', 'pending', 'deleted'];

export class SyncCampaignUseCase {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly historyRepository: ICampaignHistoryRepository,
    private readonly eventBus: IEventBus,
    /**
     * Optional live-sync service. When provided and the campaign has a
     * platform_campaign_id, real metrics are pulled and persisted. When omitted
     * (or when the platform/token isn't syncable) the use-case still records a
     * metadata-only sync so the action never silently fails.
     */
    private readonly platformSync?: IPlatformSyncService,
  ) {}

  async execute(input: SyncCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const campaign = await this.campaignRepository.findByIdAndWorkspace(
      input.campaignId,
      input.workspaceId,
    );

    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    let synced = campaign;
    let previousValue: Record<string, unknown> | null = null;
    let newValue: Record<string, unknown> | null = null;
    let liveSynced = false;

    if (
      this.platformSync?.supports(campaign.platform) &&
      campaign.platformCampaignId &&
      campaign.adAccountId
    ) {
      const metrics = await this.platformSync.syncCampaign({
        platform: campaign.platform,
        platformCampaignId: campaign.platformCampaignId,
        adAccountId: campaign.adAccountId,
      });

      if (metrics) {
        const nextStatus =
          metrics.status && VALID_STATUSES.includes(metrics.status as CampaignStatus)
            ? (metrics.status as CampaignStatus)
            : campaign.status;

        previousValue = {
          spend: campaign.spend,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          conversions: campaign.conversions,
          status: campaign.status,
        };
        newValue = {
          spend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          status: nextStatus,
        };

        const updated = await this.campaignRepository.update(input.campaignId, {
          status: nextStatus,
          spend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          ctr: metrics.ctr,
          conversions: metrics.conversions,
          cpa: metrics.cpa,
          roas: metrics.roas,
          frequency: metrics.frequency,
          cpm: metrics.cpm,
          cpc: metrics.cpc,
        });

        if (updated) {
          synced = updated;
          liveSynced = true;
        }
      }
    }

    await this.historyRepository.create({
      campaignId: input.campaignId,
      userId: input.userId,
      userName: input.userName ?? null,
      action: 'synced',
      details: {
        platform: campaign.platform,
        platformCampaignId: campaign.platformCampaignId,
        liveSynced,
      },
      previousValue,
      newValue,
    });

    await this.eventBus.publish(
      new CampaignUpdatedEvent(input.campaignId, input.workspaceId, { synced: true, liveSynced }),
    );

    return ok(synced);
  }
}
