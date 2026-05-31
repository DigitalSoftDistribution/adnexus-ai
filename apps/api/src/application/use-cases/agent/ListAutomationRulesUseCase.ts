import type { IAutomationRuleRepository, AutomationRuleListResult } from '../../../domain/repositories/IAutomationRuleRepository';
import { Result, ok } from '../../../domain/value-objects/Result';

interface ListAutomationRulesInput {
  workspaceId: string;
  status?: string | string[];
  triggerType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAutomationRulesUseCase {
  constructor(private readonly automationRuleRepository: IAutomationRuleRepository) {}

  async execute(input: ListAutomationRulesInput): Promise<Result<AutomationRuleListResult>> {
    const result = await this.automationRuleRepository.list({
      workspaceId: input.workspaceId,
      status: input.status as any,
      triggerType: input.triggerType as any,
      search: input.search,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
