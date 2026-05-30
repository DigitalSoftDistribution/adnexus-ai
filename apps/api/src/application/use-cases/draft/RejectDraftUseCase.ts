import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface RejectDraftInput {
  draftId: string;
  workspaceId: string;
  rejectedBy: string;
  userRole: string;
  reason?: string;
}

export class RejectDraftUseCase {
  constructor(private draftRepo: IDraftRepository) {}

  async execute(input: RejectDraftInput): Promise<Result<Draft>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to reject drafts'));
    }

    const draft = await this.draftRepo.findByIdAndWorkspace(input.draftId, input.workspaceId);
    if (!draft) {
      return err(new NotFoundError('Draft'));
    }

    if (draft.status !== 'pending') {
      return err(new ForbiddenError('Only pending drafts can be rejected'));
    }

    const updated = await this.draftRepo.reject(input.draftId, input.rejectedBy, input.reason);
    if (!updated) {
      return err(new NotFoundError('Draft'));
    }

    return ok(updated);
  }
}
