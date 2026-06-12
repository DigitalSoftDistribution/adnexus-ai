import type { Comment } from '../../../domain/entities/Comment';
import type { ICommentRepository } from '../../../domain/repositories/ICommentRepository';
import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err, NotFoundError } from '../../../domain/value-objects/Result';

export interface CreateCommentInput {
  workspaceId: string;
  userId: string;
  draftId: string;
  text: string;
  parentId?: string | null;
}

export class CreateCommentUseCase {
  constructor(
    private commentRepo: ICommentRepository,
    private draftRepo: IDraftRepository,
  ) {}

  async execute(input: CreateCommentInput): Promise<Result<Comment>> {
    const draft = await this.draftRepo.findById(input.draftId);
    if (!draft || draft.workspaceId !== input.workspaceId) {
      return err(new NotFoundError('Draft'));
    }

    if (input.parentId) {
      const parent = await this.commentRepo.findById(input.parentId);
      if (!parent || parent.draftId !== input.draftId) {
        return err(new NotFoundError('Parent comment'));
      }
    }

    const comment = await this.commentRepo.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      draftId: input.draftId,
      text: input.text,
      parentId: input.parentId ?? null,
    });

    return ok(comment);
  }
}
