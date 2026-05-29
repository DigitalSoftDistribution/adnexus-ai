import type { Workspace, PlanTier, WorkspaceLimits } from '../entities/Workspace';
import type { WorkspaceMember, WorkspaceRole } from '../entities/User';

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: string): Promise<Workspace[]>;
  create(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace>;
  update(id: string, updates: Partial<Workspace>): Promise<Workspace | null>;
  delete(id: string): Promise<boolean>;

  // Members
  getMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  addMember(workspaceId: string, userId: string, role: WorkspaceRole, invitedBy: string): Promise<WorkspaceMember>;
  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember | null>;
  removeMember(workspaceId: string, userId: string): Promise<boolean>;

  // Limits
  getLimits(workspaceId: string): Promise<WorkspaceLimits>;
  checkLimit(workspaceId: string, resource: keyof WorkspaceLimits): Promise<boolean>;
}
