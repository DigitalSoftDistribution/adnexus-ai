import { describe, it, expect, vi } from 'vitest';
import { RejectDraftUseCase } from './RejectDraftUseCase';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';

const makeDraft = (overrides: Partial<Draft> = {}): Draft =>
  ({
    id: 'draft-1',
    workspaceId: 'ws-1',
    platform: 'meta',
    campaignId: 'camp-1',
    draftType: 'budget_change',
    changeSummary: 'Increase budget',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Draft;

const makeRepo = (overrides: Partial<IDraftRepository> = {}): IDraftRepository =>
  ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn().mockResolvedValue(makeDraft()),
    list: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn().mockResolvedValue(makeDraft({ status: 'rejected' })),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    ...overrides,
  }) as IDraftRepository;

const baseInput = {
  draftId: 'draft-1',
  workspaceId: 'ws-1',
  rejectedBy: 'user-1',
  userRole: 'admin',
};

describe('RejectDraftUseCase', () => {
  it('rejects a pending draft with a reason', async () => {
    const repo = makeRepo();
    const useCase = new RejectDraftUseCase(repo);

    const result = await useCase.execute({ ...baseInput, reason: 'Budget too high' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('rejected');
    expect(repo.reject).toHaveBeenCalledWith('draft-1', 'user-1', 'Budget too high');
  });

  it('rejects a pending draft WITHOUT a reason (reason is optional)', async () => {
    const repo = makeRepo();
    const useCase = new RejectDraftUseCase(repo);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    expect(repo.reject).toHaveBeenCalledWith('draft-1', 'user-1', undefined);
  });

  it('denies a viewer (403)', async () => {
    const useCase = new RejectDraftUseCase(makeRepo());
    const result = await useCase.execute({ ...baseInput, userRole: 'viewer' });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it('returns 404 when the draft does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const useCase = new RejectDraftUseCase(repo);
    const result = await useCase.execute(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });

  it('refuses to reject a non-pending draft', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi.fn().mockResolvedValue(makeDraft({ status: 'approved' })),
    });
    const useCase = new RejectDraftUseCase(repo);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    expect(repo.reject).not.toHaveBeenCalled();
  });
});
