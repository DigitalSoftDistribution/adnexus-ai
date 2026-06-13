import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAnalyticsController(container: Container) {
  return {
    data: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignSummary.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;

      res.json({
        success: true,
        data: {
          summary: result.data,
          source: 'campaign_summary',
          generatedAt: new Date().toISOString(),
        },
      });
    }),
  };
}
