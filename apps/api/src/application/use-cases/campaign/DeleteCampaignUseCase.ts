import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DeleteCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteCampaignUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: DeleteCampaignInput): Promise<Result<void>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to delete campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    await this.campaignRepo.delete(input.campaignId);
    return ok(undefined);
  }
}
