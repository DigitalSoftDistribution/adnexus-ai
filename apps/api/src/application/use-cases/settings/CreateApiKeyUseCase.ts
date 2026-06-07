import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { ApiKey } from '../../../domain/entities/ApiKey';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

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

    if (!input.name?.trim()) {
      return err(new ValidationError('API key name is required'));
    }

    const key = await this.settingsRepo.createApiKey(input.workspaceId, input.name.trim());
    return ok(key);
  }
}
