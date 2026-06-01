import type { Workspace, WorkspaceLimits } from '../entities/Workspace';
import type { WorkspaceMember, WorkspaceRole } from '../entities/User';

export interface WorkspaceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface WorkspaceListResult {
  workspaces: Workspace[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IWorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: string): Promise<Workspace[]>;
  list(filters: WorkspaceFilters): Promise<WorkspaceListResult>;
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
