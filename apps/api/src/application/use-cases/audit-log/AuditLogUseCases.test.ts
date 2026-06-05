import { describe, it, expect, vi } from 'vitest';
import { ListAuditLogUseCase } from './ListAuditLogUseCase';
import { GetAuditLogSummaryUseCase } from './GetAuditLogSummaryUseCase';
import type { AuditLogEntry } from '../../../domain/entities/AuditLogEntry';
import type { IAuditLogRepository, AuditLogSummary } from '../../../domain/repositories/IAuditLogRepository';

const entry: AuditLogEntry = {
  id: 'log-1',
  workspaceId: 'ws-1',
  userId: 'u-1',
  actorType: 'user',
  actorId: 'u-1',
  actorName: 'Ada',
  action: 'Created campaign',
  actionCategory: 'campaign_created',
  platform: 'meta',
  campaignId: 'c-1',
  entityType: 'campaign',
  entityId: 'c-1',
  metadata: { name: 'Spring' },
  details: null,
  source: 'dashboard',
  ipAddress: '127.0.0.1',
  createdAt: new Date('2026-06-01T00:00:00Z'),
};

const summary: AuditLogSummary = {
  totalEntries: 10,
  entriesToday: 2,
  entriesThisWeek: 8,
  actionBreakdown: { campaign_created: 4 },
  entityBreakdown: { campaign: 6 },
  topUsers: [{ userId: 'u-1', userName: 'Ada', count: 5 }],
};

const makeRepo = (overrides: Partial<IAuditLogRepository> = {}): IAuditLogRepository =>
  ({
    list: vi.fn().mockResolvedValue({ entries: [entry], total: 1, page: 1, totalPages: 1 }),
    getSummary: vi.fn().mockResolvedValue(summary),
    findById: vi.fn().mockResolvedValue(entry),
    ...overrides,
  }) as IAuditLogRepository;

describe('ListAuditLogUseCase', () => {
  it('lists audit log entries', async () => {
    const res = await new ListAuditLogUseCase(makeRepo()).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.entries).toEqual([entry]);
  });

  it('forwards all audit log filters', async () => {
    const repo = makeRepo();
    await new ListAuditLogUseCase(repo).execute({
      workspaceId: 'ws-1',
      userId: 'u-1',
      actionCategory: ['campaign_created', 'campaign_updated'],
      entityType: 'campaign',
      entityId: 'c-1',
      campaignId: 'c-1',
      platform: 'meta',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-05',
      page: 2,
      limit: 25,
    });

    expect(repo.list).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      userId: 'u-1',
      actionCategory: ['campaign_created', 'campaign_updated'],
      entityType: 'campaign',
      entityId: 'c-1',
      campaignId: 'c-1',
      platform: 'meta',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-05',
      page: 2,
      limit: 25,
    });
  });
});

describe('GetAuditLogSummaryUseCase', () => {
  it('returns an audit log summary scoped by workspace', async () => {
    const repo = makeRepo();
    const res = await new GetAuditLogSummaryUseCase(repo).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(summary);
    expect(repo.getSummary).toHaveBeenCalledWith('ws-1');
  });

  it('allows an unscoped summary for admin views', async () => {
    const repo = makeRepo();
    const res = await new GetAuditLogSummaryUseCase(repo).execute({});
    expect(res.success).toBe(true);
    expect(repo.getSummary).toHaveBeenCalledWith(undefined);
  });
});
