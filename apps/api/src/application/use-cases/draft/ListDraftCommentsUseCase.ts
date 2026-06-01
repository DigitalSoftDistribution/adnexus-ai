import type { IDraftCommentRepository, DraftCommentListResult } from '../../../domain/repositories/IDraftCommentRepository';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError } from '../../../domain/value-objects/Result';

interface ListDraftCommentsInput {
  draftId: string;
  workspaceId: string;
  userRole: string;
  page?: number;
  limit?: number;
}

export class ListDraftCommentsUseCase {
  constructor(
    private readonly draftRepository: IDraftRepository,
    private readonly commentRepository: IDraftCommentRepository,
  ) {}

  async execute(input: ListDraftCommentsInput): Promise<Result<DraftCommentListResult>> {
    const draft = await this.draftRepository.findById(input.draftId);

    if (!draft || draft.workspaceId !== input.workspaceId) {
      return err(new NotFoundError('Draft'));
    }

    const result = await this.commentRepository.listByDraft(input.draftId, input.page, input.limit);
    return ok(result);
  }
}
