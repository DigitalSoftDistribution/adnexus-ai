import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface PauseCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class PauseCampaignUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: PauseCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to pause campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    const updated = await this.campaignRepo.update(input.campaignId, { status: 'paused' });
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    return ok(updated);
  }
}
