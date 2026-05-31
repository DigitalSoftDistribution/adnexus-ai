import type { User, WorkspaceMember, WorkspaceRole } from '../entities/User';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  workspaceId?: string;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  list(filters: UserFilters): Promise<UserListResult>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;

  // Workspace membership
  getWorkspaces(userId: string): Promise<WorkspaceMember[]>;
  getRoleInWorkspace(userId: string, workspaceId: string): Promise<WorkspaceRole | null>;
}
