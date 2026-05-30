import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetCampaignByIdInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class GetCampaignByIdUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: GetCampaignByIdInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    if (campaign.workspaceId !== input.workspaceId) {
      return err(new ForbiddenError('Campaign does not belong to workspace'));
    }

    return ok(campaign);
  }
}
