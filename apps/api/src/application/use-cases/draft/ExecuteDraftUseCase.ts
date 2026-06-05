import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface ExecuteDraftInput {
  draftId: string;
  workspaceId: string;
  executedBy: string;
  userRole: string;
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

    const executedAt = new Date().toISOString();
    const executionMetadata = {
      execution: {
        executedBy: input.executedBy,
        executedAt,
        status: 'succeeded',
        source: 'draft_approval_flow',
      },
      rollback: {
        condition: draft.changeDetail.rollbackCondition ?? draft.changeDetail.rollback_condition ?? null,
        status: 'available',
        sourceDraftId: draft.id,
      },
    };

    const updated = await this.draftRepo.updateStatus(input.draftId, 'executed', executionMetadata);
    if (!updated) {
      return err(new NotFoundError('Draft'));
    }

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.executedBy,
      action: `Draft executed: ${updated.changeSummary}`,
      actionCategory: 'draft_executed',
      campaignId: updated.campaignId ?? undefined,
      entityType: 'draft',
      entityId: updated.id,
      actorType: 'user',
      actorId: input.executedBy,
      metadata: {
        draftType: updated.draftType,
        platform: updated.platform,
        execution: executionMetadata.execution,
        rollback: executionMetadata.rollback,
      },
      source: 'dashboard',
    });

    return ok(updated);
  }
}
