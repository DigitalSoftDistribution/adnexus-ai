import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { requireAuth } from '../middleware/requireAuth';
import { filterMcpCatalog, getMcpStatusMetadata, summarizeMcpCatalog } from './mcpCatalog';

export function createMcpRoutes(_container: Container): Router {
  const router = Router();

  router.get('/status', requireAuth, (_req, res) => {
    res.json({
      success: true,
      data: getMcpStatusMetadata(),
    });
  });

  router.get('/tools', requireAuth, (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const tools = filterMcpCatalog({ status, mode, category });

    res.json({
      success: true,
      data: {
        tools,
        catalog: summarizeMcpCatalog(),
      },
    });
  });

  return router;
}
