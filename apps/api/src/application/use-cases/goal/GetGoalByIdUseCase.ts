import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { Goal } from '../../../domain/entities/Goal';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetGoalByIdInput {
  goalId: string;
  workspaceId: string;
}

export class GetGoalByIdUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: GetGoalByIdInput): Promise<Result<Goal>> {
    const goal = await this.goalRepository.findByIdAndWorkspace(input.goalId, input.workspaceId);

    if (!goal) {
      return err(new NotFoundError('Goal'));
    }

    return ok(goal);
  }
}
