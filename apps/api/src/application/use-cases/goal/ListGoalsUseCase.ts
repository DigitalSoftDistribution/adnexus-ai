import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { GoalListResult } from '../../../domain/entities/Goal';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListGoalsInput {
  workspaceId: string;
  campaignId?: string;
  status?: string | string[];
  metric?: string | string[];
  period?: string | string[];
  page?: number;
  limit?: number;
}

export class ListGoalsUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: ListGoalsInput): Promise<Result<GoalListResult>> {
    const result = await this.goalRepository.list({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      status: input.status as any,
      metric: input.metric as any,
      period: input.period as any,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
