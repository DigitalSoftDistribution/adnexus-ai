import type { IAudienceRepository, AudienceListResult } from '../../../domain/repositories/IAudienceRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListAudiencesInput {
  workspaceId: string;
  userRole: string;
  platform?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListAudiencesUseCase {
  constructor(private audienceRepo: IAudienceRepository) {}

  async execute(input: ListAudiencesInput): Promise<Result<AudienceListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.audienceRepo.list({
      workspaceId: input.workspaceId,
      platform: input.platform,
      type: input.type,
      status: input.status,
      search: input.search,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
