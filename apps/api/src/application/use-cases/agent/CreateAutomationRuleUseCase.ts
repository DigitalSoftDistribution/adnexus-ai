import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

interface CreateAutomationRuleInput {
  workspaceId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConditions: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  userId: string;
  userRole: string;
}

export class CreateAutomationRuleUseCase {
  constructor(
    private readonly automationRuleRepository: IAutomationRuleRepository,
    private readonly eventBus: IEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(input: CreateAutomationRuleInput): Promise<Result<AutomationRule>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name || input.name.trim().length < 2) {
      return err(new ValidationError('Rule name must be at least 2 characters'));
    }

    const rule = await this.automationRuleRepository.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      description: input.description ?? null,
      triggerType: input.triggerType as AutomationRule['triggerType'],
      triggerConditions: input.triggerConditions,
      actionType: input.actionType as AutomationRule['actionType'],
      actionConfig: input.actionConfig,
      status: 'active',
      lastTriggeredAt: null,
      triggerCount: 0,
      createdBy: input.userId,
    });

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `Automation rule created: ${rule.name}`,
      actionCategory: 'rule_created',
      entityType: 'automation_rule',
      entityId: rule.id,
      metadata: { triggerType: rule.triggerType, actionType: rule.actionType },
      source: 'dashboard',
    });

    return ok(rule);
  }
}
