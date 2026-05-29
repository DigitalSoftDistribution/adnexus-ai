export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
