import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface UpdateWorkspaceSettingsInput {
  workspaceId: string;
  userRole: string;
  updates: {
    name?: string;
    slug?: string;
    branding?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };
}

export class UpdateWorkspaceSettingsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: UpdateWorkspaceSettingsInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can update workspace settings'));
    }

    const success = await this.settingsRepo.updateWorkspace(input.workspaceId, input.updates);
    return ok(success);
  }
}
