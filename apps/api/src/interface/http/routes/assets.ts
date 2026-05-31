import { Router } from 'express';
import type { Container } from '../../../application/services/Container';
import { createAssetController } from '../controllers/AssetController';
import { requireAuth, requireRole } from '../middleware/requireAuth';

export function createAssetRoutes(container: Container): Router {
  const router = Router();
  const controller = createAssetController(container);

  router.get('/', requireAuth, controller.list as any);
  router.get('/:id', requireAuth, controller.getById as any);
  router.post('/', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.create as any);
  router.put('/:id', requireAuth, requireRole('owner', 'admin', 'editor') as any, controller.update as any);
  router.delete('/:id', requireAuth, requireRole('owner', 'admin') as any, controller.delete as any);

  return router;
}
