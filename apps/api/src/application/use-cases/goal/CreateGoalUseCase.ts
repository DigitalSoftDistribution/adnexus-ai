import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { Goal } from '../../../domain/entities/Goal';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

interface CreateGoalInput {
  workspaceId: string;
  campaignId?: string | null;
  name: string;
  description?: string;
  metric: string;
  targetValue: number;
  period: string;
  startDate?: string;
  endDate?: string;
  alertThreshold?: number;
  userRole: string;
}

export class CreateGoalUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: CreateGoalInput): Promise<Result<Goal>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name || input.name.trim().length < 2) {
      return err(new ValidationError('Goal name must be at least 2 characters'));
    }

    if (input.targetValue <= 0) {
      return err(new ValidationError('Target value must be greater than 0'));
    }

    const goal = await this.goalRepository.create({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      metric: input.metric as Goal['metric'],
      targetValue: input.targetValue,
      currentValue: 0,
      period: input.period as Goal['period'],
      status: 'active',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      alertThreshold: input.alertThreshold ?? null,
    });

    return ok(goal);
  }
}
