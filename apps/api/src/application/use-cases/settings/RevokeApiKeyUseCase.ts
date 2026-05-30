import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface RevokeApiKeyInput {
  workspaceId: string;
  userRole: string;
  keyId: string;
}

export class RevokeApiKeyUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: RevokeApiKeyInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can revoke API keys'));
    }

    const success = await this.settingsRepo.revokeApiKey(input.workspaceId, input.keyId);
    return ok(success);
  }
}
