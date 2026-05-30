import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { Draft } from '../../../domain/entities/Draft';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetDraftByIdInput {
  draftId: string;
  workspaceId: string;
  userRole: string;
}

export class GetDraftByIdUseCase {
  constructor(private draftRepo: IDraftRepository) {}

  async execute(input: GetDraftByIdInput): Promise<Result<Draft>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const draft = await this.draftRepo.findByIdAndWorkspace(input.draftId, input.workspaceId);
    if (!draft) {
      return err(new NotFoundError('Draft'));
    }

    return ok(draft);
  }
}
