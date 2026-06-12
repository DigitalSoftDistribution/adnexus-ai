import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { AdAccountConnectedEvent } from '../../../domain/events/DomainEvent';
import { type AdAccount, type AdAccountPlatform, type AdAccountStatus } from '../../../domain/entities/AdAccount';
import { Result, ok, err, ValidationError, ForbiddenError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface ConnectAdAccountInput {
  workspaceId: string;
  platform: AdAccountPlatform;
  platformAccountId: string;
  name: string;
  oauthToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date;
  scopes?: string[];
  spendCap?: number;
  metadata?: Record<string, unknown>;
  userId: string;
  userRole: string;
}

export class ConnectAdAccountUseCase {
  constructor(
    private adAccountRepo: IAdAccountRepository,
    private workspaceRepo: IWorkspaceRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: ConnectAdAccountInput): Promise<Result<AdAccount>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can connect ad accounts'));
    }

    if (!input.platformAccountId || !input.name) {
      return err(new ValidationError('Platform account ID and name are required'));
    }

    const oauthToken = input.oauthToken?.trim();
    if (!oauthToken || oauthToken === 'placeholder_token') {
      return err(new ValidationError('A real OAuth token is required to connect an ad account'));
    }

    const existing = await this.adAccountRepo.findByPlatformAccountId(
      input.platformAccountId,
      input.platform,
    );
    if (existing) {
      return err(new ValidationError('This platform account is already connected'));
    }

    const withinLimit = await this.workspaceRepo.checkLimit(input.workspaceId, 'maxAdAccounts');
    if (!withinLimit) {
      return err(new ValidationError('Ad account limit reached for this workspace'));
    }

    const adAccount = await this.adAccountRepo.create({
      workspaceId: input.workspaceId,
      platform: input.platform,
      platformAccountId: input.platformAccountId,
      name: input.name.trim(),
      status: 'active' as AdAccountStatus,
      oauthToken,
      refreshToken: input.refreshToken?.trim() || null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      isActive: true,
      scopes: input.scopes ?? [],
      lastSyncedAt: null,
      spendCap: input.spendCap ?? null,
      disabledReason: null,
      metadata: input.metadata ?? {},
    });

    await this.eventBus.publish(
      new AdAccountConnectedEvent(adAccount.id, adAccount.workspaceId, adAccount.platform),
    );

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `Ad account connected: ${adAccount.name}`,
      actionCategory: 'ad_account_connected',
      platform: adAccount.platform,
      entityType: 'ad_account',
      entityId: adAccount.id,
      metadata: { platform: adAccount.platform, platformAccountId: adAccount.platformAccountId },
      source: 'dashboard',
    });

    return ok(adAccount);
  }
}
