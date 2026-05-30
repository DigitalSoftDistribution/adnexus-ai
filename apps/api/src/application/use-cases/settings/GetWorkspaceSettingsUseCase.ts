import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, NotFoundError, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetWorkspaceSettingsInput {
  workspaceId: string;
  userRole: string;
}

export interface WorkspaceSettingsOutput {
  id: string;
  name: string;
  slug: string;
  plan: string;
  branding: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

export class GetWorkspaceSettingsUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetWorkspaceSettingsInput): Promise<Result<WorkspaceSettingsOutput>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const workspace = await this.settingsRepo.getWorkspace(input.workspaceId);
    if (!workspace) {
      return err(new NotFoundError('Workspace'));
    }

    return ok(workspace);
  }
}
