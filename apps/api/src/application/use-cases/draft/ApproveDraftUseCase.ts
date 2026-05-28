import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { DraftApprovedEvent } from '../../../domain/events/DomainEvent';
import { Result, ok, err, ForbiddenError, ValidationError, NotFoundError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface ApproveDraftInput {
  draftId: string;
  workspaceId: string;
  approvedBy: string;
  userRole: string;
}

export class ApproveDraftUseCase {
  constructor(
    private draftRepo: IDraftRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: ApproveDraftInput): Promise<Result<{ id: string; status: string }>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners, admins, and editors can approve drafts'));
    }

    const draft = await this.draftRepo.findByIdAndWorkspace(input.draftId, input.workspaceId);
    if (!draft) {
      return err(new NotFoundError('Draft'));
    }

    if (draft.status !== 'pending') {
      return err(new ValidationError(`Cannot approve draft with status: ${draft.status}`));
    }

    const updated = await this.draftRepo.approve(input.draftId, input.approvedBy);
    if (!updated) {
      return err(new ValidationError('Failed to approve draft'));
    }

    await this.eventBus.publish(
      new DraftApprovedEvent(updated.id, updated.workspaceId, input.approvedBy),
    );

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.approvedBy,
      action: `Draft approved: ${updated.changeSummary}`,
      actionCategory: 'draft_approved',
      campaignId: updated.campaignId ?? undefined,
      entityType: 'draft',
      entityId: updated.id,
      source: 'dashboard',
    });

    return ok({ id: updated.id, status: updated.status });
  }
}
