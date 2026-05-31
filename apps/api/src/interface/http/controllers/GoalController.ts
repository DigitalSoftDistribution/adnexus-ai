import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createGoalController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listGoals.execute({
        workspaceId: req.user!.workspaceId,
        campaignId: req.query.campaignId as string | undefined,
        status: req.query.status as string | string[] | undefined,
        metric: req.query.metric as string | string[] | undefined,
        period: req.query.period as string | string[] | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getGoalById.execute({
        goalId: req.params.id,
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createGoal.execute({
        workspaceId: req.user!.workspaceId,
        campaignId: req.body.campaignId,
        name: req.body.name,
        description: req.body.description,
        metric: req.body.metric,
        targetValue: req.body.targetValue,
        period: req.body.period,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        alertThreshold: req.body.alertThreshold,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateGoal.execute({
        goalId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    delete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteGoal.execute({
        goalId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),

    progress: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getGoalProgress.execute({
        goalId: req.params.id,
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
