import type { IDraftCommentRepository } from '../../../domain/repositories/IDraftCommentRepository';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { DraftComment } from '../../../domain/entities/DraftComment';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

interface AddDraftCommentInput {
  draftId: string;
  workspaceId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  content: string;
  userRole: string;
}

export class AddDraftCommentUseCase {
  constructor(
    private readonly draftRepository: IDraftRepository,
    private readonly commentRepository: IDraftCommentRepository,
  ) {}

  async execute(input: AddDraftCommentInput): Promise<Result<DraftComment>> {
    const draft = await this.draftRepository.findById(input.draftId);

    if (!draft || draft.workspaceId !== input.workspaceId) {
      return err(new NotFoundError('Draft'));
    }

    if (!input.content || input.content.trim().length === 0) {
      return err(new ForbiddenError('Comment content is required'));
    }

    const comment = await this.commentRepository.create({
      draftId: input.draftId,
      userId: input.userId,
      userName: input.userName,
      userAvatar: input.userAvatar,
      content: input.content.trim(),
    });

    return ok(comment);
  }
}
