import { describe, it, expect, vi } from 'vitest';
import { TestAlertUseCase } from './TestAlertUseCase';
import { GetAlertStatsUseCase } from './GetAlertStatsUseCase';
import type { IAlertRepository, Alert, AlertHistoryEntry, AlertStats } from '../../../domain/repositories/IAlertRepository';

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

const workspaceStats: AlertStats = {
  total: 3,
  enabled: 2,
  triggered24h: 1,
  byType: { budget: 2, performance: 1 },
};

const makeRepo = (overrides: Partial<IAlertRepository> = {}): IAlertRepository =>
  ({
    list: vi.fn(),
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(alert),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggle: vi.fn(),
    getHistory: vi.fn().mockResolvedValue([historyEntry]),
    addHistory: vi.fn().mockImplementation((entry: { message: string }) =>
      Promise.resolve({ id: 'h-1', ...entry, triggeredAt: new Date(), acknowledged: false }),
    ),
    getStats: vi.fn().mockResolvedValue(workspaceStats),
    ...overrides,
  }) as IAlertRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

const notificationService = {
  send: vi.fn().mockResolvedValue(undefined),
  sendBulk: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
};

describe('TestAlertUseCase', () => {
  it('records a test history entry for an editor', async () => {
    const repo = makeRepo();
    const res = await new TestAlertUseCase(repo, notificationService).execute({
      alertId: 'al-1',
      workspaceId: 'ws-1',
      userRole: 'editor',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(repo.addHistory).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('[TEST]') }),
    );
  });

  it('denies a viewer (403)', async () => {
    const res = await new TestAlertUseCase(makeRepo(), notificationService).execute({
      alertId: 'al-1',
      workspaceId: 'ws-1',
      userRole: 'viewer',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });
});

describe('GetAlertStatsUseCase', () => {
  it('returns per-alert stats for a viewer', async () => {
    const res = await new GetAlertStatsUseCase(makeRepo()).execute({
      alertId: 'al-1',
      workspaceId: 'ws-1',
      userRole: 'viewer',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTriggers).toBe(1);
      expect(res.data.avgMetricValue).toBe(1200);
      expect(res.data.total).toBe(3);
    }
  });

  it('404s when alert is missing', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetAlertStatsUseCase(repo).execute({
      alertId: 'missing',
      workspaceId: 'ws-1',
      userRole: 'viewer',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});
