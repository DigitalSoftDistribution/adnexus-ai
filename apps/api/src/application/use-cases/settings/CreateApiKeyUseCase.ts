import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { ApiKey } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface CreateApiKeyInput {
  workspaceId: string;
  userRole: string;
  name: string;
}

export class CreateApiKeyUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: CreateApiKeyInput): Promise<Result<ApiKey & { fullKey: string }>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can create API keys'));
    }

    const key = await this.settingsRepo.createApiKey(input.workspaceId, input.name);
    return ok(key);
  }
}
