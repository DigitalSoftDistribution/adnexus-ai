import { describe, it, expect, vi } from 'vitest';
import { ListAlertsUseCase } from './ListAlertsUseCase';
import { GetAlertByIdUseCase } from './GetAlertByIdUseCase';
import { CreateAlertUseCase } from './CreateAlertUseCase';
import { UpdateAlertUseCase } from './UpdateAlertUseCase';
import { DeleteAlertUseCase } from './DeleteAlertUseCase';
import { ToggleAlertUseCase } from './ToggleAlertUseCase';
import { GetAlertHistoryUseCase } from './GetAlertHistoryUseCase';
import type { IAlertRepository, Alert, AlertHistoryEntry } from '../../../domain/repositories/IAlertRepository';

const alert: Alert = {
  id: 'al-1',
  workspaceId: 'ws-1',
  name: 'Budget overspend',
  type: 'budget',
  metric: 'spend',
  operator: 'gt',
  threshold: 1000,
  enabled: true,
  channels: ['email'],
  lastTriggeredAt: null,
  triggerCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const historyEntry: AlertHistoryEntry = {
  id: 'h-1',
  alertId: 'al-1',
  triggeredAt: new Date(),
  metricValue: 1200,
  message: 'Spend exceeded 1000',
  acknowledged: false,
};

const makeRepo = (overrides: Partial<IAlertRepository> = {}): IAlertRepository =>
  ({
    list: vi.fn().mockResolvedValue({ alerts: [alert], total: 1, page: 1, limit: 20 }),
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(alert),
    create: vi.fn().mockResolvedValue(alert),
    update: vi.fn().mockResolvedValue(alert),
    delete: vi.fn().mockResolvedValue(true),
    toggle: vi.fn().mockResolvedValue({ ...alert, enabled: false }),
    getHistory: vi.fn().mockResolvedValue([historyEntry]),
    addHistory: vi.fn(),
    ...overrides,
  }) as IAlertRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListAlertsUseCase', () => {
  it('lists alerts for a viewer', async () => {
    const res = await new ListAlertsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListAlertsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'nobody' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('forwards type/enabled filters', async () => {
    const repo = makeRepo();
    await new ListAlertsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'admin', type: 'budget', enabled: true });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ type: 'budget', enabled: true }));
  });
});

describe('GetAlertByIdUseCase', () => {
  it('returns a workspace-scoped alert', async () => {
    const res = await new GetAlertByIdUseCase(makeRepo()).execute({ alertId: 'al-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
  });

  it('404s when not found', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAlertByIdUseCase(repo).execute({ alertId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateAlertUseCase', () => {
  const base = {
    workspaceId: 'ws-1', userRole: 'editor', name: 'Budget overspend',
    type: 'budget' as const, metric: 'spend', operator: 'gt' as const, threshold: 1000,
  };

  it('creates an alert with default channel + enabled', async () => {
    const repo = makeRepo();
    const res = await new CreateAlertUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, channels: ['email'], triggerCount: 0, lastTriggeredAt: null }),
    );
  });

  it('honors explicit channels', async () => {
    const repo = makeRepo();
    await new CreateAlertUseCase(repo).execute({ ...base, channels: ['slack', 'email'] });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ channels: ['slack', 'email'] }));
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateAlertUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a blank name (400)', async () => {
    const res = await new CreateAlertUseCase(makeRepo()).execute({ ...base, name: '  ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });
});

describe('UpdateAlertUseCase', () => {
  const base = { alertId: 'al-1', workspaceId: 'ws-1', userRole: 'editor', updates: { threshold: 2000 } };

  it('updates for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateAlertUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('al-1', { threshold: 2000 });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateAlertUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the alert does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateAlertUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DeleteAlertUseCase', () => {
  const base = { alertId: 'al-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteAlertUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('al-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteAlertUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the alert does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteAlertUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('ToggleAlertUseCase', () => {
  const base = { alertId: 'al-1', workspaceId: 'ws-1', userRole: 'editor', enabled: false };

  it('toggles enabled state for an editor', async () => {
    const repo = makeRepo();
    const res = await new ToggleAlertUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.toggle).toHaveBeenCalledWith('al-1', false);
    if (res.success) expect(res.data.enabled).toBe(false);
  });

  it('denies a viewer (403)', async () => {
    const res = await new ToggleAlertUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the alert does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new ToggleAlertUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.toggle).not.toHaveBeenCalled();
  });
});

describe('GetAlertHistoryUseCase', () => {
  it('returns history for a viewer', async () => {
    const res = await new GetAlertHistoryUseCase(makeRepo()).execute({ alertId: 'al-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toHaveLength(1);
  });

  it('404s when the alert is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAlertHistoryUseCase(repo).execute({ alertId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
