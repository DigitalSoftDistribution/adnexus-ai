// import type { Request, Response } from 'express';
import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createCampaignController(container: Container) {
  return {
    list: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listCampaigns.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        status: req.query.status as string | string[] | undefined,
        platform: req.query.platform as string | string[] | undefined,
        search: req.query.search as string | undefined,
        objective: req.query.objective as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    create: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createCampaign.execute({
        workspaceId: req.user!.workspaceId,
        adAccountId: req.body.adAccountId,
        platform: req.body.platform,
        name: req.body.name,
        status: req.body.status,
        objective: req.body.objective,
        budgetType: req.body.budgetType,
        dailyBudget: req.body.dailyBudget,
        lifetimeBudget: req.body.lifetimeBudget,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    summary: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignSummary.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignById?.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
        return;
      }

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    update: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateCampaign.execute({
        campaignId: req.params.id,
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
      const result = await container.deleteCampaign.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),

    pause: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.pauseCampaign.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        userId: req.user!.id,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    activate: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.activateCampaign.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        userId: req.user!.id,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    duplicate: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.duplicateCampaign.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    insights: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignInsights.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    history: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getCampaignHistory.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        action: req.query.action as string | string[] | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    sync: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.syncCampaign.execute({
        campaignId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        userId: req.user!.id,
        userName: req.user!.name,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
