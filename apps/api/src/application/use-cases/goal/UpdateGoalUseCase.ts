import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import type { Goal } from '../../../domain/entities/Goal';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface UpdateGoalInput {
  goalId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Goal>;
}

export class UpdateGoalUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: UpdateGoalInput): Promise<Result<Goal>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.goalRepository.findByIdAndWorkspace(input.goalId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Goal'));
    }

    const goal = await this.goalRepository.update(input.goalId, input.updates);

    if (!goal) {
      return err(new NotFoundError('Goal'));
    }

    return ok(goal);
  }
}
