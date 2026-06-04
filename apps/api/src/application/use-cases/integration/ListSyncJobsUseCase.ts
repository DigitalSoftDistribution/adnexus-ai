import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { ISyncJobRepository, SyncJob } from '../../../domain/repositories/ISyncJobRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface ListSyncJobsInput {
  workspaceId: string;
  adAccountId: string;
  userRole: string;
  limit?: number;
}

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

/** Returns recent sync-job history for an ad account (workspace-scoped). */
export class ListSyncJobsUseCase {
  constructor(
    private readonly adAccountRepo: IAdAccountRepository,
    private readonly syncJobRepo: ISyncJobRepository,
  ) {}

  async execute(input: ListSyncJobsInput): Promise<Result<SyncJob[]>> {
    if (!READ_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    const account = await this.adAccountRepo.findByIdAndWorkspace(input.adAccountId, input.workspaceId);
    if (!account) {
      return err(new NotFoundError('Ad account'));
    }
    const jobs = await this.syncJobRepo.listForAccount(input.adAccountId, input.limit);
    return ok(jobs);
  }
}
