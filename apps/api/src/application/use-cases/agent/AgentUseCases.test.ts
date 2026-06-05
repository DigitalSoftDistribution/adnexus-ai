import { describe, it, expect, vi } from 'vitest';
import { ListAutomationRulesUseCase } from './ListAutomationRulesUseCase';
import { GetAutomationRuleByIdUseCase } from './GetAutomationRuleByIdUseCase';
import { CreateAutomationRuleUseCase } from './CreateAutomationRuleUseCase';
import { UpdateAutomationRuleUseCase } from './UpdateAutomationRuleUseCase';
import { ToggleAutomationRuleUseCase } from './ToggleAutomationRuleUseCase';
import { DeleteAutomationRuleUseCase } from './DeleteAutomationRuleUseCase';
import { GetAgentStatusUseCase } from './GetAgentStatusUseCase';
import type { IAutomationRuleRepository } from '../../../domain/repositories/IAutomationRuleRepository';
import type { AutomationRule } from '../../../domain/entities/AutomationRule';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';

const rule: AutomationRule = {
  id: 'rule-1',
  workspaceId: 'ws-1',
  name: 'Pause high CPA',
  description: 'Pause campaigns when CPA spikes',
  triggerType: 'performance',
  triggerConditions: { metric: 'cpa', operator: 'gt', value: 50 },
  actionType: 'pause',
  actionConfig: { target: 'campaign' },
  status: 'active',
  lastTriggeredAt: null,
  triggerCount: 0,
  createdBy: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IAutomationRuleRepository> = {}): IAutomationRuleRepository =>
  ({
    findById: vi.fn().mockResolvedValue(rule),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(rule),
    list: vi.fn().mockResolvedValue({ rules: [rule], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(rule),
    update: vi.fn().mockResolvedValue(rule),
    delete: vi.fn().mockResolvedValue(true),
    updateTriggerCount: vi.fn().mockResolvedValue(undefined),
    countByWorkspace: vi.fn().mockResolvedValue(4),
    ...overrides,
  }) as IAutomationRuleRepository;

const makeBus = (): IEventBus =>
  ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as IEventBus;

const makeAudit = (): IAuditLogger =>
  ({ log: vi.fn().mockResolvedValue(undefined), logBatch: vi.fn().mockResolvedValue(undefined) }) as IAuditLogger;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAutomationRulesUseCase', () => {
  it('lists automation rules and forwards filters', async () => {
    const repo = makeRepo();
    const res = await new ListAutomationRulesUseCase(repo).execute({
      workspaceId: 'ws-1',
      status: ['active', 'paused'],
      triggerType: 'performance',
      search: 'cpa',
      page: 2,
      limit: 20,
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.rules).toEqual([rule]);
    expect(repo.list).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      status: ['active', 'paused'],
      triggerType: 'performance',
      search: 'cpa',
      page: 2,
      limit: 20,
    });
  });
});

describe('GetAutomationRuleByIdUseCase', () => {
  it('returns a workspace-scoped rule', async () => {
    const repo = makeRepo();
    const res = await new GetAutomationRuleByIdUseCase(repo).execute({ ruleId: 'rule-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    expect(repo.findByIdAndWorkspace).toHaveBeenCalledWith('rule-1', 'ws-1');
  });

  it('404s when the rule is not in the workspace', async () => {
    const res = await new GetAutomationRuleByIdUseCase(makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) })).execute({
      ruleId: 'missing',
      workspaceId: 'ws-1',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateAutomationRuleUseCase', () => {
  const base = {
    workspaceId: 'ws-1',
    name: '  Pause high CPA  ',
    triggerType: 'performance',
    triggerConditions: { metric: 'cpa', operator: 'gt', value: 50 },
    actionType: 'pause',
    actionConfig: { target: 'campaign' },
    userId: 'u-1',
    userRole: 'editor',
  };

  it('creates a rule with normalized defaults and writes an audit log', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const res = await new CreateAutomationRuleUseCase(repo, makeBus(), audit).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'ws-1',
      name: 'Pause high CPA',
      status: 'active',
      lastTriggeredAt: null,
      triggerCount: 0,
      createdBy: 'u-1',
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionCategory: 'rule_created', entityType: 'automation_rule' }));
  });

  it('denies viewers before creating', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const res = await new CreateAutomationRuleUseCase(repo, makeBus(), audit).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects names shorter than two characters', async () => {
    const repo = makeRepo();
    const res = await new CreateAutomationRuleUseCase(repo, makeBus(), makeAudit()).execute({ ...base, name: 'x' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('UpdateAutomationRuleUseCase', () => {
  it('updates an existing rule for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateAutomationRuleUseCase(repo).execute({
      ruleId: 'rule-1',
      workspaceId: 'ws-1',
      userRole: 'editor',
      updates: { name: 'Renamed' },
    });
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('rule-1', { name: 'Renamed' });
  });

  it('denies viewers before lookup', async () => {
    const repo = makeRepo();
    const res = await new UpdateAutomationRuleUseCase(repo).execute({
      ruleId: 'rule-1',
      workspaceId: 'ws-1',
      userRole: 'viewer',
      updates: { name: 'Renamed' },
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('ToggleAutomationRuleUseCase', () => {
  it('pauses an active rule', async () => {
    const repo = makeRepo({ update: vi.fn().mockResolvedValue({ ...rule, status: 'paused' }) });
    const res = await new ToggleAutomationRuleUseCase(repo).execute({ ruleId: 'rule-1', workspaceId: 'ws-1', userRole: 'editor' });
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('rule-1', { status: 'paused' });
  });

  it('activates a paused rule', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi.fn().mockResolvedValue({ ...rule, status: 'paused' }),
      update: vi.fn().mockResolvedValue({ ...rule, status: 'active' }),
    });
    const res = await new ToggleAutomationRuleUseCase(repo).execute({ ruleId: 'rule-1', workspaceId: 'ws-1', userRole: 'editor' });
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('rule-1', { status: 'active' });
  });
});

describe('DeleteAutomationRuleUseCase', () => {
  it('deletes an existing rule for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteAutomationRuleUseCase(repo).execute({ ruleId: 'rule-1', workspaceId: 'ws-1', userRole: 'admin' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('rule-1');
  });

  it('denies editors before lookup', async () => {
    const repo = makeRepo();
    const res = await new DeleteAutomationRuleUseCase(repo).execute({ ruleId: 'rule-1', workspaceId: 'ws-1', userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe('GetAgentStatusUseCase', () => {
  it('returns status using the active rule count', async () => {
    const repo = makeRepo({ countByWorkspace: vi.fn().mockResolvedValue(4) });
    const res = await new GetAgentStatusUseCase(repo).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.isRunning).toBe(true);
      expect(res.data.rulesActive).toBe(4);
      expect(res.data.creditsTotal).toBe(1000);
      expect(res.data.nextRunAt).toEqual(expect.any(String));
    }
    expect(repo.countByWorkspace).toHaveBeenCalledWith('ws-1');
  });
});
