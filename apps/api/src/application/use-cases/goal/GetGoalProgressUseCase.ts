import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { GoalProgress } from '../../../domain/entities/Goal';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetGoalProgressInput {
  goalId: string;
  workspaceId: string;
}

export class GetGoalProgressUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: GetGoalProgressInput): Promise<Result<GoalProgress>> {
    const existing = await this.goalRepository.findByIdAndWorkspace(input.goalId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Goal'));
    }

    const progress = await this.goalRepository.getProgress(input.goalId);

    if (!progress) {
      return err(new NotFoundError('Goal progress'));
    }

    return ok(progress);
  }
}
