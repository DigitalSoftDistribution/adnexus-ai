import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { UserInvitedEvent } from '../../../domain/events/DomainEvent';
import type { WorkspaceMember, WorkspaceRole } from '../../../domain/entities/User';
import { Result, ok, err, ValidationError, ForbiddenError, ConflictError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface InviteMemberInput {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  inviterRole: string;
}

export class InviteMemberUseCase {
  constructor(
    private workspaceRepo: IWorkspaceRepository,
    private userRepo: IUserRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: InviteMemberInput): Promise<Result<WorkspaceMember>> {
    // Only owners and admins can invite
    if (!['owner', 'admin'].includes(input.inviterRole)) {
      return err(new ForbiddenError('Only workspace owners and admins can invite members'));
    }

    // Prevent inviting as owner through this endpoint
    if (input.role === 'owner') {
      return err(new ValidationError('Cannot assign owner role via invitation'));
    }

    // Admins cannot invite other admins
    if (input.inviterRole === 'admin' && input.role === 'admin') {
      return err(new ForbiddenError('Admins cannot invite other admins'));
    }

    // Check workspace user limit
    const withinLimit = await this.workspaceRepo.checkLimit(input.workspaceId, 'maxUsers');
    if (!withinLimit) {
      return err(new ValidationError('Workspace member limit reached'));
    }

    // Find user by email
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      return err(new ValidationError('User not found. They must sign up first.'));
    }

    // Check if already a member
    const existing = await this.workspaceRepo.getMember(input.workspaceId, user.id);
    if (existing) {
      return err(new ConflictError('User is already a member of this workspace'));
    }

    const member = await this.workspaceRepo.addMember(
      input.workspaceId,
      user.id,
      input.role,
      input.invitedBy,
    );

    await this.eventBus.publish(
      new UserInvitedEvent(input.workspaceId, user.id, input.invitedBy, input.role),
    );

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.invitedBy,
      action: `Invited ${input.email} as ${input.role}`,
      actionCategory: 'member_invited',
      entityType: 'workspace_member',
      entityId: member.id,
      metadata: { invitedUserId: user.id, role: input.role },
      source: 'dashboard',
    });

    return ok(member);
  }
}
