import type { IAudienceRepository } from '../../../domain/repositories/IAudienceRepository';
import type { Audience } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAudienceByIdInput {
  audienceId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAudienceByIdUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: GetAudienceByIdInput): Promise<Result<Audience>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const audience = await this.audienceRepo.findByIdAndWorkspace(input.audienceId, input.workspaceId);
    if (!audience) {
      return err(new NotFoundError('Audience'));
    }

    return ok(audience);
  }
}
