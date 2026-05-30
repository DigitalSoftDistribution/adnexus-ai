import type { AutomationRule, AutomationRuleStatus, AutomationRuleTriggerType } from '../entities/AutomationRule';

export interface AutomationRuleFilters {
  workspaceId: string;
  status?: AutomationRuleStatus | AutomationRuleStatus[];
  triggerType?: AutomationRuleTriggerType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AutomationRuleListResult {
  rules: AutomationRule[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAutomationRuleRepository {
  findById(id: string): Promise<AutomationRule | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<AutomationRule | null>;
  list(filters: AutomationRuleFilters): Promise<AutomationRuleListResult>;
  create(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule>;
  update(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null>;
  delete(id: string): Promise<boolean>;
  updateTriggerCount(id: string): Promise<void>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
