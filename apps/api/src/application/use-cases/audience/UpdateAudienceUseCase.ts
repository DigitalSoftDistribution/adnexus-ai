import type { IAudienceRepository } from '../../../domain/repositories/IAudienceRepository';
import type { Audience } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface UpdateAudienceInput {
  audienceId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Audience>;
}

export class UpdateAudienceUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: UpdateAudienceInput): Promise<Result<Audience>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.audienceRepo.findByIdAndWorkspace(input.audienceId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Audience'));
    }

    const audience = await this.audienceRepo.update(input.audienceId, input.updates);
    if (!audience) {
      return err(new NotFoundError('Audience'));
    }

    return ok(audience);
  }
}
