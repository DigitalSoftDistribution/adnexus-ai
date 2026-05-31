import type { IGoalRepository } from '../../../domain/repositories/IGoalRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteGoalInput {
  goalId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteGoalUseCase {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async execute(input: DeleteGoalInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.goalRepository.findByIdAndWorkspace(input.goalId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Goal'));
    }

    const deleted = await this.goalRepository.delete(input.goalId);
    return ok(deleted);
  }
}
