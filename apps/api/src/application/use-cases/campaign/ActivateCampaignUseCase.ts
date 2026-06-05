import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IPlatformWriteService } from '../../ports/IPlatformWriteService';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';
import { PlatformWriteError } from './PauseCampaignUseCase';

export interface ActivateCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  userId?: string;
}

export class ActivateCampaignUseCase {
  constructor(
    private campaignRepo: ICampaignRepository,
    /** Optional: when present, the resume is also applied on the ad platform. */
    private platformWrite?: IPlatformWriteService,
    /** Optional: when present, records an audit entry for the activation. */
    private auditLogger?: IAuditLogger,
  ) {}

  async execute(input: ActivateCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to activate campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    let platformApplied = false;
    if (
      this.platformWrite?.supports(campaign.platform) &&
      campaign.platformCampaignId &&
      campaign.adAccountId
    ) {
      const result = await this.platformWrite.resumeCampaign({
        platform: campaign.platform,
        platformCampaignId: campaign.platformCampaignId,
        adAccountId: campaign.adAccountId,
      });
      if (!result.applied && result.reason === 'platform_error') {
        return err(new PlatformWriteError(`Failed to activate on platform: ${result.message}`));
      }
      platformApplied = result.applied;
    }

    const updated = await this.campaignRepo.update(input.campaignId, { status: 'active' });
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      action: `Campaign activated: ${campaign.name}`,
      actionCategory: 'campaign_activated',
      platform: campaign.platform,
      campaignId: campaign.id,
      entityType: 'campaign',
      entityId: campaign.id,
      metadata: { platformApplied, platformCampaignId: campaign.platformCampaignId },
      source: 'dashboard',
    });

    return ok(updated);
  }
}
