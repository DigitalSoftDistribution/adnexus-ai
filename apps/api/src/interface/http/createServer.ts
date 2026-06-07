/**
 * HTTP Server Factory
 *
 * Creates a standalone Express application wired with Clean Architecture
 * dependencies (v2). The runtime v2 wiring itself lives in `mountV2.ts` and is
 * shared with the production entrypoint (`src/index.ts`), so this factory only
 * sets up the surrounding middleware (security, body parsing, health, metrics)
 * and the stable v1 OAuth routers, then delegates `/api/v2/*` to mountV2Routes.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, isDevelopment, isProduction, isAllowedCorsOrigin } from '../../config';
import { requestLogger } from '../../middleware/requestLogger';
import { unauthenticatedRateLimiter } from '../../middleware/rateLimiter';

// Legacy routes (stable — OAuth)
import authRoutes from '../../routes/auth';
import metaOAuthRoutes from '../../routes/auth/meta';
import googleOAuthRoutes from '../../routes/auth/google';

import { mountV2Routes } from './mountV2';

export function createServer() {
  const app = express();

  // Security
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{random}'"],
        styleSrc: ["'self'", "'nonce-{random}'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    } : false,
    crossOriginEmbedderPolicy: isProduction,
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedCorsOrigin(origin, config.cors.origin) || isDevelopment) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging & rate limiting
  app.use(requestLogger);
  app.use(unauthenticatedRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: config.version, timestamp: new Date().toISOString() });
  });

  // Metrics
  app.get('/metrics', async (_req, res) => {
    const { getMetrics } = await import('../../lib/monitoring');
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  });

  // Legacy Routes (v1, stable — OAuth)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth/meta', metaOAuthRoutes);
  app.use('/api/v1/auth/google', googleOAuthRoutes);

  // V2 Clean Architecture Routes (shared runtime wiring)
  mountV2Routes(app);

  // 404 (v2 error handling is scoped inside mountV2Routes)
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  return app;
}
