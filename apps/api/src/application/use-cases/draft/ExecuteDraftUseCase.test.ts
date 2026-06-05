import { describe, it, expect, vi } from 'vitest';
import { DraftExecutionDisabledError, ExecuteDraftUseCase } from './ExecuteDraftUseCase';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { Draft } from '../../../domain/entities/Draft';

const makeDraft = (overrides: Partial<Draft> = {}): Draft =>
  ({
    id: 'draft-1',
    workspaceId: 'ws-1',
    platform: 'meta',
    campaignId: 'camp-1',
    adsetId: null,
    adId: null,
    draftType: 'budget_adjustment',
    changeSummary: 'Increase budget',
    changeDetail: {
      rollbackCondition: 'Rollback if ROAS drops below baseline',
      riskLevel: 'high',
    },
    aiReasoning: 'Evidence-backed budget recommendation',
    impactEstimate: '+10% roas',
    actorType: 'ai',
    actorId: null,
    actorName: 'AI Agent',
    ruleId: null,
    status: 'approved',
    approvedBy: 'approver-1',
    approvedAt: new Date(),
    executedAt: null,
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
    updateStatus: vi.fn().mockResolvedValue(makeDraft({ status: 'executed' })),
    approve: vi.fn(),
    reject: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    ...overrides,
  }) as IDraftRepository;

const makeAudit = (): IAuditLogger => ({
  log: vi.fn().mockResolvedValue(undefined),
  logBatch: vi.fn().mockResolvedValue(undefined),
});

const baseInput = {
  draftId: 'draft-1',
  workspaceId: 'ws-1',
  executedBy: 'user-1',
  userRole: 'editor',
};

describe('ExecuteDraftUseCase', () => {
  it('keeps approved drafts local-only and never marks them platform executed', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const useCase = new ExecuteDraftUseCase(repo, audit);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    expect(repo.updateStatus).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DraftExecutionDisabledError);
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
      expect(result.error.message).toContain('Platform execution is disabled');
    }
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('Draft platform execution blocked'),
        actionCategory: 'draft_execution_disabled',
        entityType: 'draft',
        entityId: 'draft-1',
        metadata: expect.objectContaining({
          execution: expect.objectContaining({
            requestedBy: 'user-1',
            status: 'disabled',
            platformApplied: false,
            limitation: 'v1_pilot_platform_execution_disabled',
          }),
          rollback: expect.objectContaining({
            status: 'not_available',
            reason: 'no_platform_write_was_applied',
          }),
        }),
      }),
    );
  });

  it('prevents execution bypass for pending drafts and audits the blocked attempt', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi.fn().mockResolvedValue(makeDraft({ status: 'pending' })),
    });
    const audit = makeAudit();
    const useCase = new ExecuteDraftUseCase(repo, audit);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCategory: 'draft_execution_blocked',
        metadata: expect.objectContaining({ status: 'pending', requiredStatus: 'approved' }),
      }),
    );
  });

  it('denies viewers before loading or mutating the draft', async () => {
    const repo = makeRepo();
    const audit = makeAudit();
    const useCase = new ExecuteDraftUseCase(repo, audit);

    const result = await useCase.execute({ ...baseInput, userRole: 'viewer' });

    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.findByIdAndWorkspace).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('returns 404 when the draft is outside the workspace', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(null) });
    const useCase = new ExecuteDraftUseCase(repo, makeAudit());

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(404);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
