import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface ExecuteDraftInput {
  draftId: string;
  workspaceId: string;
  executedBy: string;
  userRole: string;
}

export class ExecuteDraftUseCase {
  constructor(private draftRepo: IDraftRepository) {}

  async execute(input: ExecuteDraftInput): Promise<Result<Draft>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to execute drafts'));
    }

    const draft = await this.draftRepo.findByIdAndWorkspace(input.draftId, input.workspaceId);
    if (!draft) {
      return err(new NotFoundError('Draft'));
    }

    if (draft.status !== 'approved') {
      return err(new ForbiddenError('Only approved drafts can be executed'));
    }

    const updated = await this.draftRepo.updateStatus(input.draftId, 'executed', {
      executedBy: input.executedBy,
      executedAt: new Date().toISOString(),
    });
    if (!updated) {
      return err(new NotFoundError('Draft'));
    }

    return ok(updated);
  }
}
