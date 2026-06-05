import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface GetAutomationRuleByIdInput {
  ruleId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAutomationRuleByIdUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: GetAutomationRuleByIdInput): Promise<Result<AutomationRule>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const rule = await this.automationRuleRepository.findByIdAndWorkspace(input.ruleId, input.workspaceId);

    if (!rule) {
      return err(new NotFoundError('Automation rule'));
    }

    return ok(rule);
  }
}
