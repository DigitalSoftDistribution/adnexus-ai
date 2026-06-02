import { describe, it, expect, vi } from 'vitest';
import { ApproveDraftUseCase } from './ApproveDraftUseCase';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';
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
    approve: vi.fn().mockResolvedValue(makeDraft({ status: 'approved' })),
    reject: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    ...overrides,
  }) as IDraftRepository;

const makeEventBus = (): IEventBus => ({
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

const makeAudit = (): IAuditLogger => ({
  log: vi.fn().mockResolvedValue(undefined),
  logBatch: vi.fn().mockResolvedValue(undefined),
});

const baseInput = {
  draftId: 'draft-1',
  workspaceId: 'ws-1',
  approvedBy: 'user-1',
  userRole: 'owner',
};

describe('ApproveDraftUseCase', () => {
  it('approves a pending draft and publishes an event + audit log', async () => {
    const repo = makeRepo();
    const eventBus = makeEventBus();
    const audit = makeAudit();
    const useCase = new ApproveDraftUseCase(repo, eventBus, audit);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('approved');
    }
    expect(repo.approve).toHaveBeenCalledWith('draft-1', 'user-1');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
  });

  it('rejects a viewer (403)', async () => {
    const useCase = new ApproveDraftUseCase(makeRepo(), makeEventBus(), makeAudit());
    const result = await useCase.execute({ ...baseInput, userRole: 'viewer' });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });

  it('returns 404 when the draft does not exist', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const useCase = new ApproveDraftUseCase(repo, makeEventBus(), makeAudit());
    const result = await useCase.execute(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(404);
  });

  it('rejects approval of a non-pending draft (validation)', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi.fn().mockResolvedValue(makeDraft({ status: 'approved' })),
    });
    const eventBus = makeEventBus();
    const useCase = new ApproveDraftUseCase(repo, eventBus, makeAudit());

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(400);
    expect(repo.approve).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not publish an event when the repo approve fails', async () => {
    const repo = makeRepo({ approve: vi.fn().mockResolvedValue(null) });
    const eventBus = makeEventBus();
    const useCase = new ApproveDraftUseCase(repo, eventBus, makeAudit());

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
