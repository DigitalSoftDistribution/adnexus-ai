import { describe, it, expect, vi } from 'vitest';
import { UpdateTeamMemberRoleUseCase } from './UpdateTeamMemberRoleUseCase';
import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { WorkspaceRole } from '../../../domain/entities/User';

const makeRepo = () =>
  ({
    updateTeamMemberRole: vi.fn().mockResolvedValue(true),
  }) as unknown as ISettingsRepository;

const input = (over: Partial<{ userRole: string; role: WorkspaceRole }> = {}) => ({
  workspaceId: 'ws-1',
  userId: 'member-1',
  role: (over.role ?? 'editor') as WorkspaceRole,
  userRole: over.userRole ?? 'owner',
});

describe('UpdateTeamMemberRoleUseCase', () => {
  it('lets an owner set a member to editor', async () => {
    const repo = makeRepo();
    const result = await new UpdateTeamMemberRoleUseCase(repo).execute(input());
    expect(result.success).toBe(true);
    expect(repo.updateTeamMemberRole).toHaveBeenCalledWith('ws-1', 'member-1', 'editor');
  });

  it.each(['editor', 'analyst', 'viewer'])('denies a %s from changing roles (403)', async (role) => {
    const repo = makeRepo();
    const result = await new UpdateTeamMemberRoleUseCase(repo).execute(input({ userRole: role }));
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
    expect(repo.updateTeamMemberRole).not.toHaveBeenCalled();
  });

  it('refuses to assign the owner role (validation)', async () => {
    const repo = makeRepo();
    const result = await new UpdateTeamMemberRoleUseCase(repo).execute(input({ role: 'owner' }));
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(400);
  });

  it('prevents an admin from promoting another member to admin', async () => {
    const repo = makeRepo();
    const result = await new UpdateTeamMemberRoleUseCase(repo).execute({
      ...input({ userRole: 'admin', role: 'admin' }),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect((result.error as unknown as { statusCode: number }).statusCode).toBe(403);
  });
});
