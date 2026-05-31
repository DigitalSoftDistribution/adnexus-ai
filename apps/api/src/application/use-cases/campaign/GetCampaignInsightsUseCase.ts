import type { ICampaignInsightRepository } from '../../../domain/repositories/ICampaignInsightRepository';
import type { CampaignInsightSummary } from '../../../domain/entities/CampaignInsight';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';

interface GetCampaignInsightsInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  dateFrom?: string;
  dateTo?: string;
}

export class GetCampaignInsightsUseCase {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly insightRepository: ICampaignInsightRepository,
  ) {}

  async execute(input: GetCampaignInsightsInput): Promise<Result<CampaignInsightSummary>> {
    const campaign = await this.campaignRepository.findByIdAndWorkspace(
      input.campaignId,
      input.workspaceId,
    );

    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    const summary = await this.insightRepository.getSummary(
      input.campaignId,
      input.dateFrom,
      input.dateTo,
    );

    return ok(summary);
  }
}
