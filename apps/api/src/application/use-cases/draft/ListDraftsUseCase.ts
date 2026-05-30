import type { IDraftRepository, DraftFilters, DraftListResult } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListDraftsInput {
  workspaceId: string;
  userRole: string;
  status?: string | string[];
  platform?: string;
  draftType?: string | string[];
  campaignId?: string;
  page?: number;
  limit?: number;
}

export class ListDraftsUseCase {
  constructor(private draftRepo: IDraftRepository) {}

  async execute(input: ListDraftsInput): Promise<Result<DraftListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const filters: DraftFilters = {
      workspaceId: input.workspaceId,
      status: input.status as any,
      platform: input.platform,
      draftType: input.draftType as any,
      campaignId: input.campaignId,
      page: input.page,
      limit: input.limit,
    };

    const result = await this.draftRepo.list(filters);
    return ok(result);
  }
}
