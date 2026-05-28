import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { Workspace } from '../../../domain/entities/Workspace';
import { Result, ok, err, NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetWorkspaceInput {
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class GetWorkspaceUseCase {
  constructor(private workspaceRepo: IWorkspaceRepository) {}

  async execute(input: GetWorkspaceInput): Promise<Result<Workspace>> {
    const workspace = await this.workspaceRepo.findById(input.workspaceId);
    if (!workspace) {
      return err(new NotFoundError('Workspace'));
    }

    // Verify user is a member
    const member = await this.workspaceRepo.getMember(input.workspaceId, input.userId);
    if (!member && input.userRole !== 'owner') {
      return err(new ForbiddenError('You do not have access to this workspace'));
    }

    return ok(workspace);
  }
}
