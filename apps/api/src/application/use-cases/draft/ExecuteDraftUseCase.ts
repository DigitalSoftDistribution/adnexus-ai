import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';
import { Result, err, ForbiddenError, NotFoundError, DomainError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface ExecuteDraftInput {
  draftId: string;
  workspaceId: string;
  executedBy: string;
  userRole: string;
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

export class ExecuteDraftUseCase {
  constructor(
    private draftRepo: IDraftRepository,
    private auditLogger?: IAuditLogger,
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
}
