import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';
import { SUPPORTED_PLATFORMS, type SupportedPlatform } from './IntegrationUseCases';

export interface SelectIntegrationAccountInput {
  workspaceId: string;
  userRole: string;
  platform: string;
  accountId: string;
}

export interface SelectIntegrationAccountOutput {
  account: {
    id: string;
    platformAccountId: string;
    name: string;
    status: AdAccount['status'];
    isActive: boolean;
  };
}

const ADMIN_ROLES = ['owner', 'admin'];

export class SelectIntegrationAccountUseCase {
  constructor(private adAccountRepo: IAdAccountRepository) {}

  async execute(input: SelectIntegrationAccountInput): Promise<Result<SelectIntegrationAccountOutput>> {
    if (!ADMIN_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    if (!SUPPORTED_PLATFORMS.includes(input.platform as SupportedPlatform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }

    const account = await this.adAccountRepo.findByIdAndWorkspace(input.accountId, input.workspaceId);
    if (!account || account.platform !== input.platform) {
      return err(new NotFoundError('Ad account'));
    }

    const siblings = await this.adAccountRepo.list({
      workspaceId: input.workspaceId,
      platform: input.platform as SupportedPlatform,
    });

    await Promise.all(
      siblings.adAccounts.map((row) =>
        this.adAccountRepo.update(row.id, {
          isActive: row.id === account.id,
          status: row.id === account.id ? 'active' : row.status,
        }),
      ),
    );

    const selected = await this.adAccountRepo.update(account.id, {
      isActive: true,
      status: 'active',
    });

    const finalAccount = selected ?? account;
    return ok({
      account: {
        id: finalAccount.id,
        platformAccountId: finalAccount.platformAccountId,
        name: finalAccount.name,
        status: finalAccount.status,
        isActive: true,
      },
    });
  }
}
