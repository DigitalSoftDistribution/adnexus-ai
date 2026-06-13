import { describe, it, expect, vi } from 'vitest';
import {
  DraftExecutionDisabledError,
  DraftExecutionFailedError,
  ExecuteDraftUseCase,
  type DraftExecutionDeps,
} from './ExecuteDraftUseCase';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { IPlatformWriteService, PlatformWriteResult } from '../../ports/IPlatformWriteService';
import type { Draft } from '../../../domain/entities/Draft';
import type { Campaign } from '../../../domain/entities/Campaign';

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
      expect((result.error as DraftExecutionDisabledError).details).toEqual({
        executionMode: 'review_only',
        platformApplied: false,
        limitation: 'v1_pilot_platform_execution_disabled',
      });
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

// ─── Real execution path (flag-gated) ────────────────────────────────────────

const makeCampaign = (overrides: Partial<Campaign> = {}): Campaign =>
  ({
    id: 'camp-1',
    workspaceId: 'ws-1',
    adAccountId: 'acct-1',
    platform: 'meta',
    platformCampaignId: 'pcid-1',
    name: 'Spring Sale',
    status: 'active',
    ...overrides,
  }) as Campaign;

const makeWriteService = (
  overrides: Partial<IPlatformWriteService> = {},
): IPlatformWriteService => ({
  supports: (p) => p === 'meta',
  pauseCampaign: vi.fn().mockResolvedValue({ applied: true } as PlatformWriteResult),
  resumeCampaign: vi.fn().mockResolvedValue({ applied: true } as PlatformWriteResult),
  ...overrides,
});

const makeCampaignRepo = (campaign: Campaign | null = makeCampaign()): ICampaignRepository =>
  ({
    findByIdAndWorkspace: vi.fn().mockResolvedValue(campaign),
  }) as unknown as ICampaignRepository;

const makeExecDeps = (overrides: Partial<DraftExecutionDeps> = {}): DraftExecutionDeps => ({
  writeService: makeWriteService(),
  campaignRepo: makeCampaignRepo(),
  isExecutionEnabled: () => true,
  ...overrides,
});

const statusDraft = (overrides: Partial<Draft> = {}): Draft =>
  makeDraft({
    draftType: 'status_change',
    changeSummary: 'Pause Spring Sale',
    changeDetail: { new_status: 'PAUSED', platform_campaign_id: 'pcid-1' },
    ...overrides,
  });

describe('ExecuteDraftUseCase — real execution', () => {
  it('applies a pause to the platform and marks the draft executed', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(statusDraft()) });
    const audit = makeAudit();
    const deps = makeExecDeps();
    const useCase = new ExecuteDraftUseCase(repo, audit, deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    expect(deps.writeService!.pauseCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'meta', platformCampaignId: 'pcid-1', adAccountId: 'acct-1' }),
    );
    expect(repo.updateStatus).toHaveBeenCalledWith(
      'draft-1',
      'executed',
      expect.objectContaining({
        execution: expect.objectContaining({ platformApplied: true, action: 'pause' }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionCategory: 'draft_executed' }),
    );
  });

  it('resolves a resume action from an ACTIVE target', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi
        .fn()
        .mockResolvedValue(statusDraft({ changeDetail: { new_status: 'ACTIVE' } })),
    });
    const deps = makeExecDeps({ campaignRepo: makeCampaignRepo(makeCampaign({ status: 'paused' })) });
    const useCase = new ExecuteDraftUseCase(repo, makeAudit(), deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    expect(deps.writeService!.resumeCampaign).toHaveBeenCalled();
    expect(deps.writeService!.pauseCampaign).not.toHaveBeenCalled();
  });

  it('marks the draft failed and returns 502 when the platform rejects the write', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(statusDraft()) });
    const audit = makeAudit();
    const deps = makeExecDeps({
      writeService: makeWriteService({
        pauseCampaign: vi
          .fn()
          .mockResolvedValue({ applied: false, reason: 'platform_error', message: 'rate limited' }),
      }),
    });
    const useCase = new ExecuteDraftUseCase(repo, audit, deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(DraftExecutionFailedError);
      expect((result.error as unknown as { statusCode: number }).statusCode).toBe(502);
    }
    expect(repo.updateStatus).toHaveBeenCalledWith('draft-1', 'failed', expect.any(Object));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionCategory: 'draft_execution_failed' }),
    );
  });

  it('stays in disabled mode when the workspace flag is off', async () => {
    const repo = makeRepo({ findByIdAndWorkspace: vi.fn().mockResolvedValue(statusDraft()) });
    const deps = makeExecDeps({ isExecutionEnabled: () => false });
    const useCase = new ExecuteDraftUseCase(repo, makeAudit(), deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeInstanceOf(DraftExecutionDisabledError);
    expect(deps.writeService!.pauseCampaign).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('falls through to disabled for non-executable draft types (e.g. budget)', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi
        .fn()
        .mockResolvedValue(statusDraft({ draftType: 'budget_adjustment' })),
    });
    const deps = makeExecDeps();
    const useCase = new ExecuteDraftUseCase(repo, makeAudit(), deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeInstanceOf(DraftExecutionDisabledError);
    expect(deps.writeService!.pauseCampaign).not.toHaveBeenCalled();
  });

  it('fails safe when the campaign has no resolvable platform id', async () => {
    const repo = makeRepo({
      findByIdAndWorkspace: vi
        .fn()
        .mockResolvedValue(statusDraft({ changeDetail: { new_status: 'PAUSED' } })),
    });
    const deps = makeExecDeps({
      campaignRepo: makeCampaignRepo(makeCampaign({ platformCampaignId: null })),
    });
    const useCase = new ExecuteDraftUseCase(repo, makeAudit(), deps);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeInstanceOf(DraftExecutionFailedError);
    expect(repo.updateStatus).toHaveBeenCalledWith('draft-1', 'failed', expect.any(Object));
  });
});
