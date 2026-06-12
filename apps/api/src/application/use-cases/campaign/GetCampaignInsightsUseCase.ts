import type { ICampaignInsightRepository } from '../../../domain/repositories/ICampaignInsightRepository';
import type { CampaignInsightSummary } from '../../../domain/entities/CampaignInsight';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import * as cache from '../../../services/cache-service';

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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFrom = input.dateFrom ?? thirtyDaysAgo.toISOString().slice(0, 10);
    const dateTo = input.dateTo ?? now.toISOString().slice(0, 10);

    const cacheKey = `insights:${input.workspaceId}:${input.campaignId}:${dateFrom}:${dateTo}`;
    const cached = await cache.get<CampaignInsightSummary>(cacheKey);
    if (cached) {
      return ok(cached);
    }

    const summary = await this.insightRepository.getSummary(
      input.campaignId,
      dateFrom,
      dateTo,
    );

    await cache.set(cacheKey, summary, 600); // 10 min cache
    return ok(summary);
  }
}
