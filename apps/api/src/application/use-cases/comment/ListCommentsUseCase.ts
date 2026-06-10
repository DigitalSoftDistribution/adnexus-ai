import type { Comment } from '../../../domain/entities/Comment';
import type { ICommentRepository } from '../../../domain/repositories/ICommentRepository';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err, NotFoundError } from '../../../domain/value-objects/Result';

export interface ListCommentsInput {
  workspaceId: string;
  draftId?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

export class ListCommentsUseCase {
  constructor(
    private commentRepo: ICommentRepository,
    private draftRepo: IDraftRepository,
  ) {}

  async execute(input: ListCommentsInput): Promise<Result<{ comments: Comment[]; total: number; page: number; totalPages: number }>> {
    if (input.draftId) {
      const draft = await this.draftRepo.findById(input.draftId);
      if (!draft || draft.workspaceId !== input.workspaceId) {
        return err(new NotFoundError('Draft'));
      }
    }

    const result = await this.commentRepo.list({
      workspaceId: input.workspaceId,
      draftId: input.draftId,
      entityType: input.entityType,
      entityId: input.entityId,
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
    });

    return ok(result);
  }
}
