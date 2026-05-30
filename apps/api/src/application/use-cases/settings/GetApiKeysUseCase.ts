import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { ApiKey } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetApiKeysInput {
  workspaceId: string;
  userRole: string;
}

export class GetApiKeysUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetApiKeysInput): Promise<Result<ApiKey[]>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can view API keys'));
    }

    const keys = await this.settingsRepo.getApiKeys(input.workspaceId);
    return ok(keys);
  }
}
