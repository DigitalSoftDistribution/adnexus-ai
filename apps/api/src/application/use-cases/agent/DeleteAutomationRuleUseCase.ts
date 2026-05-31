import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteAutomationRuleInput {
  ruleId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteAutomationRuleUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: DeleteAutomationRuleInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.automationRuleRepository.findByIdAndWorkspace(input.ruleId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Automation rule'));
    }

    const deleted = await this.automationRuleRepository.delete(input.ruleId);
    return ok(deleted);
  }
}
