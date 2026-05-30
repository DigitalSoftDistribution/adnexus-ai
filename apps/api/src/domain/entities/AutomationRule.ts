export type AutomationRuleTriggerType = 'performance' | 'schedule' | 'budget' | 'creative_fatigue' | 'custom';
export type AutomationRuleActionType = 'pause' | 'adjust_budget' | 'notify' | 'create_draft' | 'adjust_bid';
export type AutomationRuleStatus = 'active' | 'paused' | 'archived';

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  triggerType: AutomationRuleTriggerType;
  triggerConditions: Record<string, unknown>;
  actionType: AutomationRuleActionType;
  actionConfig: Record<string, unknown>;
  status: AutomationRuleStatus;
  lastTriggeredAt: Date | null;
  triggerCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
