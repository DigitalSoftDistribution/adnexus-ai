import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DuplicateCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
}

export class DuplicateCampaignUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: DuplicateCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to duplicate campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, name, ...rest } = campaign;
    void _id; void _createdAt; void _updatedAt;

    const duplicated = await this.campaignRepo.create({
      ...rest,
      name: `${name} (Copy)`,
      status: 'draft',
      platformCampaignId: null,
    });

    return ok(duplicated);
  }
}
