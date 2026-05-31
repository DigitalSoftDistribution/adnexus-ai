import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { ICampaignHistoryRepository } from '../../../domain/repositories/ICampaignHistoryRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { CampaignUpdatedEvent } from '../../../domain/events/DomainEvent';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface SyncCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  userId: string;
  userName?: string | null;
}

export class SyncCampaignUseCase {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly historyRepository: ICampaignHistoryRepository,
    private readonly eventBus: IEventBus,
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

    await this.historyRepository.create({
      campaignId: input.campaignId,
      userId: input.userId,
      userName: input.userName ?? null,
      action: 'synced',
      details: { platform: campaign.platform, platformCampaignId: campaign.platformCampaignId },
      previousValue: null,
      newValue: null,
    });

    await this.eventBus.publish(
      new CampaignUpdatedEvent(input.campaignId, input.workspaceId, { synced: true }),
    );

    return ok(campaign);
  }
}
