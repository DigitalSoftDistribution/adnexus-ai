import type { ICampaignRepository, CampaignSummary } from '../../../domain/repositories/ICampaignRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetCampaignSummaryInput {
  workspaceId: string;
  userRole: string;
}

export class GetCampaignSummaryUseCase {
  constructor(private campaignRepo: ICampaignRepository) {}

  async execute(input: GetCampaignSummaryInput): Promise<Result<CampaignSummary>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const summary = await this.campaignRepo.getSummary(input.workspaceId);
    return ok(summary);
  }
}
