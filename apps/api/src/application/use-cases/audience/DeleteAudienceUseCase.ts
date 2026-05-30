import type { IAudienceRepository } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DeleteAudienceInput {
  audienceId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteAudienceUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: DeleteAudienceInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.audienceRepo.findByIdAndWorkspace(input.audienceId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Audience'));
    }

    const success = await this.audienceRepo.delete(input.audienceId);
    return ok(success);
  }
}
