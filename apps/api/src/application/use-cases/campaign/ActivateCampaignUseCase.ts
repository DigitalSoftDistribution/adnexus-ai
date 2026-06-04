import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IPlatformWriteService } from '../../ports/IPlatformWriteService';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';
import { PlatformWriteError } from './PauseCampaignUseCase';

export interface ActivateCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class ActivateCampaignUseCase {
  constructor(
    private campaignRepo: ICampaignRepository,
    /** Optional: when present, the resume is also applied on the ad platform. */
    private platformWrite?: IPlatformWriteService,
  ) {}

  async execute(input: ActivateCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to activate campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

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
    }

    const updated = await this.campaignRepo.update(input.campaignId, { status: 'active' });
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    return ok(updated);
  }
}
