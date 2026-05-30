import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { TeamMember } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetTeamMembersInput {
  workspaceId: string;
  userRole: string;
}

export class GetTeamMembersUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetTeamMembersInput): Promise<Result<TeamMember[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const members = await this.settingsRepo.getTeamMembers(input.workspaceId);
    return ok(members);
  }
}
