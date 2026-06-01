import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createAgentController(container: Container) {
  return {
    status: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAgentStatus.execute({
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    listRules: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.listAutomationRules.execute({
        workspaceId: req.user!.workspaceId,
        status: req.query.status as string | string[] | undefined,
        triggerType: req.query.triggerType as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    getRuleById: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getAutomationRuleById.execute({
        ruleId: req.params.id,
        workspaceId: req.user!.workspaceId,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    createRule: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.createAutomationRule.execute({
        workspaceId: req.user!.workspaceId,
        name: req.body.name,
        description: req.body.description,
        triggerType: req.body.triggerType,
        triggerConditions: req.body.triggerConditions,
        actionType: req.body.actionType,
        actionConfig: req.body.actionConfig,
        userId: req.user!.id,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(201).json({ success: true, data: result.data });
    }),

    updateRule: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.updateAutomationRule.execute({
        ruleId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        updates: req.body,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),

    deleteRule: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.deleteAutomationRule.execute({
        ruleId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.status(204).send();
    }),

    toggleRule: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.toggleAutomationRule.execute({
        ruleId: req.params.id,
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });

      if (!result.success) {
        throw result.error;
      }

      res.json({ success: true, data: result.data });
    }),
  };
}
