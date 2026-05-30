import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';
import { Result, ok, err, NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface SyncAdAccountInput {
  adAccountId: string;
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class SyncAdAccountUseCase {
  constructor(
    private adAccountRepo: IAdAccountRepository,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: SyncAdAccountInput): Promise<Result<AdAccount>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners, admins, and editors can sync ad accounts'));
    }

    const adAccount = await this.adAccountRepo.findByIdAndWorkspace(
      input.adAccountId,
      input.workspaceId,
    );
    if (!adAccount) {
      return err(new NotFoundError('Ad account'));
    }

    if (adAccount.status === 'DISCONNECTED') {
      return err(new ForbiddenError('Cannot sync a disconnected ad account'));
    }

    const syncedAccount = await this.adAccountRepo.update(adAccount.id, {
      metadata: { ...adAccount.metadata, lastSyncAt: new Date().toISOString() },
    });

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `Ad account synced: ${adAccount.name}`,
      actionCategory: 'ad_account_synced',
      platform: adAccount.platform,
      entityType: 'ad_account',
      entityId: adAccount.id,
      source: 'dashboard',
    });

    return ok(syncedAccount ?? adAccount);
  }
}
