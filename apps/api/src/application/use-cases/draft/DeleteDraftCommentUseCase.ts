import type { IDraftCommentRepository } from '../../../domain/repositories/IDraftCommentRepository';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface DeleteDraftCommentInput {
  commentId: string;
  userRole: string;
}

export class DeleteDraftCommentUseCase {
  constructor(private readonly commentRepository: IDraftCommentRepository) {}

  async execute(input: DeleteDraftCommentInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const deleted = await this.commentRepository.delete(input.commentId);

    if (!deleted) {
      return err(new NotFoundError('Comment'));
    }

    return ok(true);
  }
}
