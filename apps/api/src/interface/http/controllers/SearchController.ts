import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createSearchController(container: Container) {
  return {
    search: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.search.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        query: req.query.q as string,
        types: req.query.types ? (req.query.types as string).split(',') : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    suggestions: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.searchSuggestions.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        prefix: req.query.q as string,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
