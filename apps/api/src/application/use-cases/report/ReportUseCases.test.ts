import { describe, it, expect, vi } from 'vitest';
import { ListReportsUseCase } from './ListReportsUseCase';
import { GetReportByIdUseCase } from './GetReportByIdUseCase';
import { CreateReportUseCase } from './CreateReportUseCase';
import { UpdateReportUseCase } from './UpdateReportUseCase';
import { DeleteReportUseCase } from './DeleteReportUseCase';
import { RunReportUseCase } from './RunReportUseCase';
import type { IReportRepository, Report } from '../../../domain/repositories/IReportRepository';

const report: Report = {
  id: 'rep-1',
  workspaceId: 'ws-1',
  name: 'Weekly performance',
  type: 'performance',
  config: { range: '7d' },
  schedule: null,
  lastRunAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IReportRepository> = {}): IReportRepository =>
  ({
    list: vi.fn().mockResolvedValue({ reports: [report], total: 1, page: 1, limit: 20 }),
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(report),
    create: vi.fn().mockResolvedValue(report),
    update: vi.fn().mockResolvedValue(report),
    delete: vi.fn().mockResolvedValue(true),
    runReport: vi.fn().mockResolvedValue({ rows: [{ spend: 100 }] }),
    ...overrides,
  }) as IReportRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListReportsUseCase', () => {
  it('lists reports for a viewer', async () => {
    const res = await new ListReportsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('denies an unknown role (403)', async () => {
    const res = await new ListReportsUseCase(makeRepo()).execute({ workspaceId: 'ws-1', userRole: 'nope' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('forwards type filter', async () => {
    const repo = makeRepo();
    await new ListReportsUseCase(repo).execute({ workspaceId: 'ws-1', userRole: 'admin', type: 'attribution' });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ type: 'attribution' }));
  });
});

describe('GetReportByIdUseCase', () => {
  it('returns a workspace-scoped report', async () => {
    const res = await new GetReportByIdUseCase(makeRepo()).execute({ reportId: 'rep-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
  });

  it('404s when not found', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetReportByIdUseCase(repo).execute({ reportId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateReportUseCase', () => {
  const base = {
    workspaceId: 'ws-1', userRole: 'editor', name: 'Weekly performance',
    type: 'performance' as const, config: { range: '7d' },
  };

  it('creates a report for an editor', async () => {
    const repo = makeRepo();
    const res = await new CreateReportUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Weekly performance', schedule: null, lastRunAt: null }),
    );
  });

  it('persists a provided schedule', async () => {
    const repo = makeRepo();
    const schedule = { frequency: 'weekly' as const, recipients: ['a@b.com'] };
    await new CreateReportUseCase(repo).execute({ ...base, schedule });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ schedule }));
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateReportUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a blank name (400)', async () => {
    const res = await new CreateReportUseCase(makeRepo()).execute({ ...base, name: '  ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });
});

describe('UpdateReportUseCase', () => {
  const base = { reportId: 'rep-1', workspaceId: 'ws-1', userRole: 'editor', updates: { name: 'Renamed' } };

  it('updates for an editor', async () => {
    const repo = makeRepo();
    const res = await new UpdateReportUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('rep-1', { name: 'Renamed' });
  });

  it('denies a viewer (403)', async () => {
    const res = await new UpdateReportUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('404s when the report does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new UpdateReportUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('DeleteReportUseCase', () => {
  const base = { reportId: 'rep-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteReportUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('rep-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteReportUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the report does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteReportUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('RunReportUseCase', () => {
  it('runs a report for a viewer and returns results', async () => {
    const repo = makeRepo();
    const res = await new RunReportUseCase(repo).execute({ reportId: 'rep-1', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(true);
    expect(repo.runReport).toHaveBeenCalledWith('rep-1');
    if (res.success) expect(res.data).toEqual({ rows: [{ spend: 100 }] });
  });

  it('404s when the report is not in the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new RunReportUseCase(repo).execute({ reportId: 'x', workspaceId: 'ws-1', userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.runReport).not.toHaveBeenCalled();
  });
});
