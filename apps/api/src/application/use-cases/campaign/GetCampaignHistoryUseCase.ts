import type { ICampaignHistoryRepository, CampaignHistoryListResult } from '../../../domain/repositories/ICampaignHistoryRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';

interface GetCampaignHistoryInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  action?: string | string[];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export class GetCampaignHistoryUseCase {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly historyRepository: ICampaignHistoryRepository,
  ) {}

  async execute(input: GetCampaignHistoryInput): Promise<Result<CampaignHistoryListResult>> {
    const campaign = await this.campaignRepository.findByIdAndWorkspace(
      input.campaignId,
      input.workspaceId,
    );

    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    const result = await this.historyRepository.list({
      campaignId: input.campaignId,
      action: input.action as any,
      userId: input.userId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
