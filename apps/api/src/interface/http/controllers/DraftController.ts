import type { Response } from 'express';
import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createDraftController(container: Container) {
  return {
    create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    approve: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  };
}
