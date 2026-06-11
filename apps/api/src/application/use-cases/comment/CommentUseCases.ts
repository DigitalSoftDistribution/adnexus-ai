import type { Comment } from '../../../domain/entities/Comment';
import type { ICommentRepository } from '../../../domain/repositories/ICommentRepository';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err, NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetCommentByIdInput {
  commentId: string;
  workspaceId: string;
}

export interface DeleteCommentInput {
  commentId: string;
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class GetCommentByIdUseCase {
  constructor(
    private commentRepo: ICommentRepository,
    private draftRepo: IDraftRepository,
  ) {}

  async execute(input: GetCommentByIdInput): Promise<Result<Comment>> {
    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      return err(new NotFoundError('Comment'));
    }

    // Verify the comment's draft belongs to this workspace
    const draft = await this.draftRepo.findById(comment.draftId);
    if (!draft || draft.workspaceId !== input.workspaceId) {
      return err(new NotFoundError('Comment'));
    }

    return ok(comment);
  }
}

export class DeleteCommentUseCase {
  constructor(
    private commentRepo: ICommentRepository,
    private draftRepo: IDraftRepository,
  ) {}

  async execute(input: DeleteCommentInput): Promise<Result<{ deletedId: string }>> {
    const comment = await this.commentRepo.findById(input.commentId);
    if (!comment) {
      return err(new NotFoundError('Comment'));
    }

    const isAdmin = input.userRole === 'admin';
    if (comment.userId !== input.userId && !isAdmin) {
      return err(new ForbiddenError('Not authorized to delete this comment'));
    }

    await this.commentRepo.delete(input.commentId);
    return ok({ deletedId: input.commentId });
  }
}
