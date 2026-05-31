import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import { Result, ok } from '../../../domain/value-objects/Result';

interface AgentStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  rulesActive: number;
  optimizationsToday: number;
  creditsUsed: number;
  creditsTotal: number;
}

interface GetAgentStatusInput {
  workspaceId: string;
}

export class GetAgentStatusUseCase {
  constructor(
    private readonly automationRuleRepository: IAutomationRuleRepository,
  ) {}

  async execute(input: GetAgentStatusInput): Promise<Result<AgentStatus>> {
    const activeRules = await this.automationRuleRepository.countByWorkspace(input.workspaceId);

    return ok({
      isRunning: true,
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      rulesActive: activeRules,
      optimizationsToday: 0,
      creditsUsed: 0,
      creditsTotal: 1000,
    });
  }
}
