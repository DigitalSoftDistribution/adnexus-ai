import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createDraftController(container: Container) {
  return {
    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createDraft.execute({
        workspaceId: req.user!.workspaceId,
        platform: req.body.platform,
        campaignId: req.body.campaignId,
        adsetId: req.body.adsetId,
        adId: req.body.adId,
        draftType: req.body.draftType,
        changeSummary: req.body.changeSummary,
        changeDetail: req.body.changeDetail,
        aiReasoning: req.body.aiReasoning,
        impactEstimate: req.body.impactEstimate,
        actorType: req.body.actorType ?? 'user',
        actorId: req.user!.id,
        actorName: req.user!.email,
        ruleId: req.body.ruleId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    approve: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.approveDraft.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        approvedBy: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listDrafts.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        status: req.query.status as string | string[] | undefined,
        platform: req.query.platform as string | undefined,
        draftType: req.query.draftType as string | string[] | undefined,
        campaignId: req.query.campaignId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getDraftById.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    reject: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.rejectDraft.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        rejectedBy: req.user!.id,
        userRole: req.user!.role,
        reason: req.body.reason,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    execute: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.executeDraft.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        executedBy: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    listComments: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listDraftComments.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    addComment: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.addDraftComment.execute({
        draftId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userId: req.user!.id,
        userName: req.user!.name,
        userAvatar: req.user!.avatar ?? null,
        content: req.body.content,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    deleteComment: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteDraftComment.execute({
        commentId: req.params.commentId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),
  };
}
