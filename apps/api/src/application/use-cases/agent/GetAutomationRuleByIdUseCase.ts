import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface GetAutomationRuleByIdInput {
  ruleId: string;
  workspaceId: string;
}

export class GetAutomationRuleByIdUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: GetAutomationRuleByIdInput): Promise<Result<AutomationRule>> {
    const rule = await this.automationRuleRepository.findByIdAndWorkspace(input.ruleId, input.workspaceId);

    if (!rule) {
      return err(new NotFoundError('Automation rule'));
    }

    return ok(rule);
  }
}
