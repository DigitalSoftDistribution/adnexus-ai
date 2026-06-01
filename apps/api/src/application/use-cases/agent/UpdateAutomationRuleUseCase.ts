import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface UpdateAutomationRuleInput {
  ruleId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<AutomationRule>;
}

export class UpdateAutomationRuleUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: UpdateAutomationRuleInput): Promise<Result<AutomationRule>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.automationRuleRepository.findByIdAndWorkspace(input.ruleId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Automation rule'));
    }

    const rule = await this.automationRuleRepository.update(input.ruleId, input.updates);

    if (!rule) {
      return err(new NotFoundError('Automation rule'));
    }

    return ok(rule);
  }
}
