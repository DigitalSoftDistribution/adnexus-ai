import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError, ValidationError } from '../../../domain/value-objects/Result';

export interface UpdateCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Pick<Campaign, 'name' | 'status' | 'objective' | 'budgetType' | 'dailyBudget' | 'lifetimeBudget' | 'startDate' | 'endDate'>>;
}

export class UpdateCampaignUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: UpdateCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to update campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    if (Object.keys(input.updates).length === 0) {
      return err(new ValidationError('No updates provided'));
    }

    const updated = await this.campaignRepo.update(input.campaignId, input.updates);
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    return ok(updated);
  }
}
