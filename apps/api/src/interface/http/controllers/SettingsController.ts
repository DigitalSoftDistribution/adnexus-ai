import { z } from 'zod';
import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export function createSettingsController(container: Container) {
  return {
    // Workspace
    getWorkspace: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getWorkspaceSettings.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    updateWorkspace: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateWorkspaceSettings.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    // Team
    getTeam: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getTeamMembers.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    inviteTeamMember: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const body = inviteTeamMemberSchema.parse(req.body);
      const result = await container.inviteTeamMember.execute({
        workspaceId: req.user!.workspaceId,
        email: body.email,
        role: body.role,
        invitedBy: req.user!.id,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    updateTeamMember: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateTeamMemberRole.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.params.id,
        role: req.body.role,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    removeTeamMember: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.removeTeamMember.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.params.id,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    // Integrations
    getIntegrations: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getIntegrations.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    // Notifications
    getNotifications: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getNotificationPreferences.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    updateNotifications: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateNotificationPreferences.execute({
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userRole: req.user!.role,
        preferences: req.body,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    // API Keys
    getApiKeys: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getApiKeys.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    createApiKey: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createApiKey.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        name: req.body.name,
      });
      if (!result.success) throw result.error;
      res.status(201).json({ success: true, data: result.data });
    }),

    revokeApiKey: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.revokeApiKey.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        keyId: req.params.id,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
