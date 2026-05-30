import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * V2 Auth Proxy Routes
 *
 * Proxies to v1 auth endpoints during migration. v1 auth is stable and
 * battle-tested. These routes provide a consistent v2 envelope while
 * delegating to the legacy implementation.
 */

const V1_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

async function proxyToV1(path: string, method: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${V1_BASE}/api/v1/auth${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export function createAuthRoutes(): Router {
  const router = Router();

  router.post('/signup', asyncHandler(async (req, res) => {
    const { status, data } = await proxyToV1('/signup', 'POST', req.body);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/signin', asyncHandler(async (req, res) => {
    const { status, data } = await proxyToV1('/signin', 'POST', req.body);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/refresh', asyncHandler(async (req, res) => {
    const { status, data } = await proxyToV1('/refresh', 'POST', req.body);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/signout', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const { status, data } = await proxyToV1('/signout', 'POST', req.body, authHeader ? { authorization: authHeader } : undefined);
    res.status(status).json(data ?? { success: true });
  }));

  router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const { status, data } = await proxyToV1('/me', 'GET', undefined, authHeader ? { authorization: authHeader } : undefined);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/reset-password', asyncHandler(async (req, res) => {
    const { status, data } = await proxyToV1('/reset-password', 'POST', req.body);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/change-password', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const { status, data } = await proxyToV1('/change-password', 'POST', req.body, authHeader ? { authorization: authHeader } : undefined);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/invite', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const { status, data } = await proxyToV1('/invite', 'POST', req.body, authHeader ? { authorization: authHeader } : undefined);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  router.post('/accept-invite', asyncHandler(async (req, res) => {
    const { status, data } = await proxyToV1('/accept-invite', 'POST', req.body);
    res.status(status).json(data ?? { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }));

  return router;
}
