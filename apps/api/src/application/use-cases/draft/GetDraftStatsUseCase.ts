import type { IDraftRepository, DraftStats } from '../../../domain/repositories/IDraftRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetDraftStatsInput {
  workspaceId: string;
  userRole: string;
}

export class GetDraftStatsUseCase {
  constructor(private draftRepo: IDraftRepository) {}

  async execute(input: GetDraftStatsInput): Promise<Result<DraftStats>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    const stats = await this.draftRepo.getStats(input.workspaceId);
    return ok(stats);
  }
}
