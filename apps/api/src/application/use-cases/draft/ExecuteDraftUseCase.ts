import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { Draft } from '../../../domain/entities/Draft';
import type { Platform } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError, ConflictError, DomainError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type {
  IPlatformWriteService,
  PlatformWriteContext,
  PlatformWriteResult,
} from '../../ports/IPlatformWriteService';
import { AD_PLATFORM_CAPABILITIES } from '../../ports/AdPlatformCapabilities';

export interface ExecuteDraftInput {
  draftId: string;
  workspaceId: string;
  executedBy: string;
  userRole: string;
}

/**
 * Optional collaborators that turn on REAL platform execution. When any of these
 * is absent — or `isExecutionEnabled` resolves false for the workspace — the use
 * case preserves the v1-pilot behavior: approvals record review intent only and
 * `DraftExecutionDisabledError` is returned. This keeps the default (and every
 * existing caller/test that constructs the use case with just a repo + audit
 * logger) on the safe, no-write path. See docs/specs/DRAFT_EXECUTION_SPEC.md.
 */
export interface DraftExecutionDeps {
  campaignRepo?: ICampaignRepository;
  writeService?: IPlatformWriteService;
  isExecutionEnabled?: (workspaceId: string) => Promise<boolean> | boolean;
}

export class DraftExecutionDisabledError extends DomainError {
  constructor() {
    super(
      'Platform execution is disabled for the v1 pilot. Approval records review intent only; no ad platform changes were applied.',
      'DRAFT_EXECUTION_DISABLED',
      403,
      {
        executionMode: 'review_only',
        platformApplied: false,
        limitation: 'v1_pilot_platform_execution_disabled',
      },
    );
    this.name = 'DraftExecutionDisabledError';
    Object.setPrototypeOf(this, DraftExecutionDisabledError.prototype);
  }
}

export class DraftExecutionFailedError extends DomainError {
  constructor(reason: string, message?: string) {
    super(
      message
        ? `Platform rejected the change: ${message}`
        : `Draft could not be applied to the ad platform (${reason}).`,
      'DRAFT_EXECUTION_FAILED',
      502,
      { platformApplied: false, reason },
    );
    this.name = 'DraftExecutionFailedError';
    Object.setPrototypeOf(this, DraftExecutionFailedError.prototype);
  }
}

export class ExecuteDraftUseCase {
  constructor(
    private draftRepo: IDraftRepository,
    private auditLogger?: IAuditLogger,
    private deps: DraftExecutionDeps = {},
  ) {}

  async execute(input: ExecuteDraftInput): Promise<Result<Draft>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to execute drafts'));
    }

    const draft = await this.draftRepo.findByIdAndWorkspace(input.draftId, input.workspaceId);
    if (!draft) {
      return err(new NotFoundError('Draft'));
    }

    if (draft.status !== 'approved') {
      await this.auditLogger?.log({
        workspaceId: input.workspaceId,
        userId: input.executedBy,
        action: `Draft execution blocked: ${draft.changeSummary}`,
        actionCategory: 'draft_execution_blocked',
        campaignId: draft.campaignId ?? undefined,
        entityType: 'draft',
        entityId: draft.id,
        actorType: 'user',
        actorId: input.executedBy,
        metadata: {
          status: draft.status,
          requiredStatus: 'approved',
          rollbackCondition: draft.changeDetail.rollbackCondition ?? draft.changeDetail.rollback_condition ?? null,
        },
        source: 'dashboard',
      });
      return err(new ForbiddenError('Only approved drafts can be executed'));
    }

    // Real execution path — only when fully wired AND enabled for this workspace.
    if (await this.isExecutionEnabled(input.workspaceId)) {
      const outcome = await this.tryExecuteOnPlatform(draft, input);
      // `null` means "execution is on, but this draft isn't an executable shape
      // yet" (unsupported platform/type/missing ids) — fall through to the safe
      // disabled response rather than silently dropping the request.
      if (outcome) return outcome;
    }

    const attemptedAt = new Date().toISOString();
    const disabledMetadata = {
      execution: {
        requestedBy: input.executedBy,
        requestedAt: attemptedAt,
        status: 'disabled',
        platformApplied: false,
        source: 'draft_approval_flow',
        limitation: 'v1_pilot_platform_execution_disabled',
      },
      rollback: {
        condition: draft.changeDetail.rollbackCondition ?? draft.changeDetail.rollback_condition ?? null,
        status: 'not_available',
        reason: 'no_platform_write_was_applied',
        sourceDraftId: draft.id,
      },
    };

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.executedBy,
      action: `Draft platform execution blocked (v1 pilot disabled): ${draft.changeSummary}`,
      actionCategory: 'draft_execution_disabled',
      campaignId: draft.campaignId ?? undefined,
      entityType: 'draft',
      entityId: draft.id,
      actorType: 'user',
      actorId: input.executedBy,
      metadata: {
        draftType: draft.draftType,
        platform: draft.platform,
        ...disabledMetadata,
      },
      source: 'dashboard',
    });

    return err(new DraftExecutionDisabledError());
  }

  private async isExecutionEnabled(workspaceId: string): Promise<boolean> {
    if (!this.deps.writeService || !this.deps.campaignRepo || !this.deps.isExecutionEnabled) {
      return false;
    }
    return Boolean(await this.deps.isExecutionEnabled(workspaceId));
  }

  /**
   * Attempts the live write for an executable draft. Returns a Result when the
   * draft was handled (executed or failed), or `null` when the draft is not an
   * executable shape (so the caller falls back to the disabled response).
   *
   * v1 scope: only reversible status_change (pause/resume) on writable
   * platforms. Budget/creative/structural writes are intentionally deferred —
   * see docs/specs/DRAFT_EXECUTION_SPEC.md.
   */
  private async tryExecuteOnPlatform(
    draft: Draft,
    input: ExecuteDraftInput,
  ): Promise<Result<Draft> | null> {
    const writeService = this.deps.writeService!;
    const campaignRepo = this.deps.campaignRepo!;

    if (draft.platform === 'all') return null;
    const capability = AD_PLATFORM_CAPABILITIES[draft.platform as Platform];
    if (!capability?.canWriteCampaigns || !writeService.supports(draft.platform as Platform)) {
      return null;
    }
    if (draft.draftType !== 'status_change') return null;

    const action = this.resolveStatusAction(draft.changeDetail);
    if (!action) return null;

    // Resolve the platform ids. The campaign row is authoritative for the ad
    // account + platform campaign id; fall back to ids embedded in the draft.
    let platformCampaignId: string | null = null;
    let adAccountId: string | null = null;
    let beforeStatus: string | null =
      (draft.changeDetail.old_status as string | undefined) ?? null;

    if (draft.campaignId) {
      const campaign = await campaignRepo.findByIdAndWorkspace(draft.campaignId, input.workspaceId);
      if (campaign) {
        platformCampaignId = campaign.platformCampaignId;
        adAccountId = campaign.adAccountId;
        beforeStatus = campaign.status;
      }
    }
    if (!platformCampaignId) {
      platformCampaignId = (draft.changeDetail.platform_campaign_id as string | undefined) ?? null;
    }

    if (!platformCampaignId || !adAccountId) {
      return this.recordFailure(draft, input, 'no_platform_id', undefined, beforeStatus, action.after);
    }

    // Atomically claim the draft (approved → executing) BEFORE touching the
    // platform. Only one concurrent execute can win this compare-and-set, so we
    // can never issue two platform writes for the same draft. The `executing`
    // interim state is truthful for every reader: a concurrent loser (and the
    // dashboard) sees "in progress" rather than a premature `executed`, so a
    // duplicate request can't get a false success while the write is still in
    // flight or about to fail.
    const startedAt = new Date().toISOString();
    const claimed = await this.draftRepo.claimStatus(draft.id, 'approved', 'executing', {
      execution: {
        requestedBy: input.executedBy,
        startedAt,
        status: 'executing',
        action: action.kind,
        before: { status: beforeStatus },
        after: { status: action.after },
      },
    });

    if (!claimed) {
      const current = await this.draftRepo.findByIdAndWorkspace(draft.id, input.workspaceId);
      if (current?.status === 'executed') {
        // The winning request already completed the platform write — a *real*
        // idempotent success, not an in-flight guess.
        return ok(current);
      }
      const detail =
        current?.status === 'executing'
          ? 'Draft execution is already in progress.'
          : 'Draft is no longer approved (already executed, failed, or resolved).';
      return err(new ConflictError(detail));
    }

    const ctx: PlatformWriteContext = {
      platform: draft.platform as Platform,
      platformCampaignId,
      adAccountId,
    };

    let result: PlatformWriteResult;
    try {
      result =
        action.kind === 'pause'
          ? await writeService.pauseCampaign(ctx)
          : await writeService.resumeCampaign(ctx);
    } catch (e) {
      return this.recordFailure(
        draft,
        input,
        'platform_error',
        (e as Error).message,
        beforeStatus,
        action.after,
      );
    }

    if (!result.applied) {
      const message = result.reason === 'platform_error' ? result.message : undefined;
      return this.recordFailure(draft, input, result.reason, message, beforeStatus, action.after);
    }

    // Platform write succeeded — finalize executing → executed. We are the sole
    // claimer of this row, so an unconditional transition is safe.
    const appliedAt = new Date().toISOString();
    const finalized = await this.draftRepo.updateStatus(draft.id, 'executed', {
      execution: {
        requestedBy: input.executedBy,
        startedAt,
        appliedAt,
        status: 'executed',
        platformApplied: true,
        action: action.kind,
        before: { status: beforeStatus },
        after: { status: action.after },
      },
    });

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.executedBy,
      action: `Draft executed on ${draft.platform}: ${draft.changeSummary}`,
      actionCategory: 'draft_executed',
      campaignId: draft.campaignId ?? undefined,
      entityType: 'draft',
      entityId: draft.id,
      actorType: 'user',
      actorId: input.executedBy,
      metadata: {
        draftType: draft.draftType,
        platform: draft.platform,
        platformCampaignId,
        action: action.kind,
        before: { status: beforeStatus },
        after: { status: action.after },
      },
      source: 'dashboard',
    });

    return ok(finalized ?? { ...claimed, status: 'executed', executedAt: new Date() });
  }

  private async recordFailure(
    draft: Draft,
    input: ExecuteDraftInput,
    reason: string,
    message: string | undefined,
    beforeStatus: string | null,
    afterStatus: string,
  ): Promise<Result<Draft>> {
    await this.draftRepo.updateStatus(draft.id, 'failed', {
      execution: {
        requestedBy: input.executedBy,
        attemptedAt: new Date().toISOString(),
        status: 'failed',
        platformApplied: false,
        reason,
        message: message ?? null,
        before: { status: beforeStatus },
        intended: { status: afterStatus },
      },
    });

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.executedBy,
      action: `Draft execution failed on ${draft.platform}: ${draft.changeSummary}`,
      actionCategory: 'draft_execution_failed',
      campaignId: draft.campaignId ?? undefined,
      entityType: 'draft',
      entityId: draft.id,
      actorType: 'user',
      actorId: input.executedBy,
      metadata: { draftType: draft.draftType, platform: draft.platform, reason, message: message ?? null },
      source: 'dashboard',
    });

    return err(new DraftExecutionFailedError(reason, message));
  }

  /** Maps a status_change draft's `new_status` to a pause/resume action. */
  private resolveStatusAction(
    changeDetail: Record<string, unknown>,
  ): { kind: 'pause' | 'resume'; after: string } | null {
    const raw = changeDetail.new_status ?? changeDetail.status ?? changeDetail.targetStatus;
    if (typeof raw !== 'string') return null;
    const norm = raw.trim().toUpperCase();
    if (norm === 'PAUSED' || norm === 'PAUSE') return { kind: 'pause', after: 'paused' };
    if (norm === 'ACTIVE' || norm === 'ENABLED' || norm === 'RESUME') {
      return { kind: 'resume', after: 'active' };
    }
    return null;
  }
}
