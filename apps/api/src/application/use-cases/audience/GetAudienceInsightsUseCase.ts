import type { IAudienceRepository } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAudienceInsightsInput {
  audienceId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAudienceInsightsUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: GetAudienceInsightsInput): Promise<Result<Record<string, unknown>>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.audienceRepo.findByIdAndWorkspace(input.audienceId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Audience'));
    }

    const insights = await this.audienceRepo.getInsights(input.audienceId);
    return ok(insights ?? {});
  }
}
