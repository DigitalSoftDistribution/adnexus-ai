import { z } from 'zod';

export const userRoleSchema = z.enum(['OWNER', 'ADMIN', 'ANALYST', 'VIEWER']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workspaceMemberSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: userRoleSchema,
  invitedBy: z.string().uuid().optional(),
  joinedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
