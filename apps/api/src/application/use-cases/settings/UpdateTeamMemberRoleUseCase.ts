import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { WorkspaceRole } from '../../../domain/entities/User';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface UpdateTeamMemberRoleInput {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  userRole: string;
}

export class UpdateTeamMemberRoleUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: UpdateTeamMemberRoleInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can update member roles'));
    }

    if (input.role === 'owner') {
      return err(new ValidationError('Cannot assign owner role'));
    }

    if (input.userRole === 'admin' && input.role === 'admin') {
      return err(new ForbiddenError('Admins cannot promote to admin'));
    }

    const success = await this.settingsRepo.updateTeamMemberRole(input.workspaceId, input.userId, input.role);
    return ok(success);
  }
}
