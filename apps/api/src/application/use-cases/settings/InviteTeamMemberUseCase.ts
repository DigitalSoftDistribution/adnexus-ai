import type { ISettingsRepository, TeamMember } from '../../../domain/repositories/ISettingsRepository';
import type { WorkspaceRole } from '../../../domain/entities/User';
import { Result, ok, err, ConflictError, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface InviteTeamMemberInput {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  userRole: string;
}

const INVITABLE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

export class InviteTeamMemberUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: InviteTeamMemberInput): Promise<Result<TeamMember>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can invite team members'));
    }

    if (!INVITABLE_ROLES.includes(input.role)) {
      return err(new ValidationError('Invalid team member role'));
    }

    if (input.userRole === 'admin' && input.role === 'admin') {
      return err(new ForbiddenError('Admins cannot invite other admins'));
    }

    const email = input.email.trim().toLowerCase();
    const user = await this.settingsRepo.findUserByEmail(email)
      ?? await this.settingsRepo.createInvitedUser(email);

    const existingMember = await this.settingsRepo.findTeamMember(input.workspaceId, user.id);
    if (existingMember) {
      return err(new ConflictError(`User ${email} is already a member of this workspace`));
    }

    const member = await this.settingsRepo.addTeamMember(
      input.workspaceId,
      user.id,
      input.role,
      input.invitedBy,
    );

    return ok(member);
  }
}
