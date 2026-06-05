import { describe, it, expect, vi } from 'vitest';
import { ListExportsUseCase } from './ListExportsUseCase';
import { GetExportByIdUseCase } from './GetExportByIdUseCase';
import { CreateExportUseCase } from './CreateExportUseCase';
import { DeleteExportUseCase } from './DeleteExportUseCase';
import type { IExportRepository } from '../../../domain/repositories/IExportRepository';
import type { Export } from '../../../domain/entities/Export';

const exportItem: Export = {
  id: 'exp-1',
  workspaceId: 'ws-1',
  name: 'Campaigns CSV',
  entity: 'campaigns',
  format: 'csv',
  status: 'pending',
  filters: null,
  fileUrl: null,
  fileSize: null,
  rowCount: null,
  errorMessage: null,
  createdBy: 'u-1',
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Partial<IExportRepository> = {}): IExportRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(exportItem),
    list: vi.fn().mockResolvedValue({ exports: [exportItem], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue(exportItem),
    update: vi.fn().mockResolvedValue(exportItem),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as IExportRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('ListExportsUseCase', () => {
  it('lists exports for the workspace', async () => {
    const res = await new ListExportsUseCase(makeRepo()).execute({ workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.total).toBe(1);
  });

  it('forwards status/entity/format filters', async () => {
    const repo = makeRepo();
    await new ListExportsUseCase(repo).execute({
      workspaceId: 'ws-1', status: 'completed', entity: 'campaigns', format: 'csv', page: 1, limit: 10,
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', entity: 'campaigns', format: 'csv', limit: 10 }),
    );
  });
});

describe('GetExportByIdUseCase', () => {
  it('returns a workspace-scoped export', async () => {
    const res = await new GetExportByIdUseCase(makeRepo()).execute({ exportId: 'exp-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
  });

  it('404s when not found in workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new GetExportByIdUseCase(repo).execute({ exportId: 'x', workspaceId: 'ws-1' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
  });
});

describe('CreateExportUseCase', () => {
  const base = {
    workspaceId: 'ws-1', name: 'Campaigns CSV', entity: 'campaigns',
    format: 'csv', userId: 'u-1', userRole: 'editor',
  };

  it('creates an export for an editor with pending status', async () => {
    const repo = makeRepo();
    const res = await new CreateExportUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Campaigns CSV', status: 'pending', createdBy: 'u-1', fileUrl: null }),
    );
  });

  it('denies a viewer (403)', async () => {
    const res = await new CreateExportUseCase(makeRepo()).execute({ ...base, userRole: 'viewer' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
  });

  it('rejects a too-short name (400)', async () => {
    const res = await new CreateExportUseCase(makeRepo()).execute({ ...base, name: 'x' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(400);
  });

  it('trims the name', async () => {
    const repo = makeRepo();
    await new CreateExportUseCase(repo).execute({ ...base, name: '  Spaced Export  ' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Spaced Export' }));
  });
});

describe('DeleteExportUseCase', () => {
  const base = { exportId: 'exp-1', workspaceId: 'ws-1', userRole: 'admin' };

  it('deletes for an admin', async () => {
    const repo = makeRepo();
    const res = await new DeleteExportUseCase(repo).execute(base);
    expect(res.success).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('exp-1');
  });

  it('denies an editor (403) — delete is owner/admin only', async () => {
    const repo = makeRepo();
    const res = await new DeleteExportUseCase(repo).execute({ ...base, userRole: 'editor' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('404s when the export does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const res = await new DeleteExportUseCase(repo).execute(base);
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
