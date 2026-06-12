import type { IAdAccountRepository } from '../../../domain/repositories/IAdAccountRepository';
import type { AdAccount } from '../../../domain/entities/AdAccount';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';
import { SUPPORTED_PLATFORMS, type SupportedPlatform } from './IntegrationUseCases';

export interface ListIntegrationAccountsInput {
  workspaceId: string;
  userRole: string;
  platform: string;
}

export interface IntegrationAccountView {
  id: string;
  platformAccountId: string;
  name: string;
  status: AdAccount['status'];
  isActive: boolean;
  lastSyncedAt: string | null;
}

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];

export class ListIntegrationAccountsUseCase {
  constructor(private adAccountRepo: IAdAccountRepository) {}

  async execute(input: ListIntegrationAccountsInput): Promise<Result<IntegrationAccountView[]>> {
    if (!READ_ROLES.includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }
    if (!SUPPORTED_PLATFORMS.includes(input.platform as SupportedPlatform)) {
      return err(new ForbiddenError('Unsupported platform'));
    }

    const result = await this.adAccountRepo.list({
      workspaceId: input.workspaceId,
      platform: input.platform as SupportedPlatform,
    });

    return ok(
      result.adAccounts.map((account) => ({
        id: account.id,
        platformAccountId: account.platformAccountId,
        name: account.name,
        status: account.status,
        isActive: account.isActive,
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      })),
    );
  }
}
