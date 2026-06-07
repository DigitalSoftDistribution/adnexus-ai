import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { AdAccountDisconnectedEvent } from '../../../domain/events/DomainEvent';
import { Result, ok, err, NotFoundError, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface DisconnectAdAccountInput {
  adAccountId: string;
  workspaceId: string;
  userId: string;
  userRole: string;
  reason?: string;
}

export class DisconnectAdAccountUseCase {
  constructor(
    private adAccountRepo: IAdAccountRepository,
    private campaignRepo: ICampaignRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: DisconnectAdAccountInput): Promise<Result<void>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can disconnect ad accounts'));
    }

    const adAccount = await this.adAccountRepo.findByIdAndWorkspace(
      input.adAccountId,
      input.workspaceId,
    );
    if (!adAccount) {
      return err(new NotFoundError('Ad account'));
    }

    if (adAccount.status === 'disconnected') {
      return err(new ValidationError('Ad account is already disconnected'));
    }

    const activeCampaigns = await this.campaignRepo.countByAdAccount(adAccount.id);

    await this.adAccountRepo.update(adAccount.id, {
      status: 'disconnected',
      oauthToken: null,
      refreshToken: null,
      isActive: false,
      disabledReason: input.reason ?? 'Manually disconnected',
    });

    await this.eventBus.publish(
      new AdAccountDisconnectedEvent(
        adAccount.id,
        adAccount.workspaceId,
        adAccount.platform,
        input.reason,
      ),
    );

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `Ad account disconnected: ${adAccount.name}`,
      actionCategory: 'ad_account_disconnected',
      platform: adAccount.platform,
      entityType: 'ad_account',
      entityId: adAccount.id,
      metadata: { reason: input.reason, activeCampaignsAtDisconnect: activeCampaigns },
      source: 'dashboard',
    });

    return ok(undefined);
  }
}
