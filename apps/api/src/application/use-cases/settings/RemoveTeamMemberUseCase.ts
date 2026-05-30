import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface RemoveTeamMemberInput {
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class RemoveTeamMemberUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: RemoveTeamMemberInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can remove members'));
    }

    const success = await this.settingsRepo.removeTeamMember(input.workspaceId, input.userId);
    return ok(success);
  }
}
