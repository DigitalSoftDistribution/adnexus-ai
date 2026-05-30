import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface ActivateCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class ActivateCampaignUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: ActivateCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to activate campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    const updated = await this.campaignRepo.update(input.campaignId, { status: 'active' });
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    return ok(updated);
  }
}
