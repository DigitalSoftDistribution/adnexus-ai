import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface ToggleAutomationRuleInput {
  ruleId: string;
  workspaceId: string;
  userRole: string;
}

export class ToggleAutomationRuleUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: ToggleAutomationRuleInput): Promise<Result<AutomationRule>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const rule = await this.automationRuleRepository.findByIdAndWorkspace(input.ruleId, input.workspaceId);
    if (!rule) {
      return err(new NotFoundError('Automation rule'));
    }

    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    const updated = await this.automationRuleRepository.update(input.ruleId, { status: newStatus });

    if (!updated) {
      return err(new NotFoundError('Automation rule'));
    }

    return ok(updated);
  }
}
