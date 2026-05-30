import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { Integration } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetIntegrationsInput {
  workspaceId: string;
  userRole: string;
}

export class GetIntegrationsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetIntegrationsInput): Promise<Result<Integration[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const integrations = await this.settingsRepo.getIntegrations(input.workspaceId);
    return ok(integrations);
  }
}
