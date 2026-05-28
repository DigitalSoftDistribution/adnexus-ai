/**
 * HTTP Server Factory
 *
 * Creates an Express application wired with Clean Architecture dependencies.
 * This is the composition root — the only place where infrastructure details
 * leak into the application layer.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../../config';
import { requestLogger } from '../../middleware/requestLogger';
import { authenticatedRateLimiter, unauthenticatedRateLimiter } from '../../middleware/rateLimiter';
import { expressErrorHandler } from './middleware/errorHandler';

// Infrastructure
import { CampaignRepository } from '../../infrastructure/repositories/CampaignRepository';
import { DraftRepository } from '../../infrastructure/repositories/DraftRepository';
import { WorkspaceRepository } from '../../infrastructure/repositories/WorkspaceRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { InMemoryEventBus } from '../../domain/events/EventBus';
import { SupabaseAuditLogger } from '../../infrastructure/audit/SupabaseAuditLogger';
import { NotificationService } from '../../infrastructure/notification/NotificationService';

// Application
import { Container } from '../../application/services/Container';

// Routes
import { createCampaignRoutes } from './routes/campaigns';
import { createDraftRoutes } from './routes/drafts';

// Legacy routes (to be migrated)
import authRoutes from '../../routes/auth';
import metaOAuthRoutes from '../../routes/auth/meta';
import googleOAuthRoutes from '../../routes/auth/google';

export function createServer() {
  const app = express();

  // Security
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? {
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
    crossOriginEmbedderPolicy: config.isProduction,
  }));

  app.use(cors({
    origin: config.corsOrigins,
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

  // Dependency Injection
  const eventBus = new InMemoryEventBus();
  const auditLogger = new SupabaseAuditLogger();
  const notificationService = new NotificationService();

  const container = new Container({
    campaignRepository: new CampaignRepository(),
    draftRepository: new DraftRepository(),
    workspaceRepository: new WorkspaceRepository(),
    userRepository: new UserRepository(),
    eventBus,
    auditLogger,
    notificationService,
  });

  // Legacy Routes (v1, to be migrated)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth/meta', metaOAuthRoutes);
  app.use('/api/v1/auth/google', googleOAuthRoutes);

  // New Clean Architecture Routes (v2)
  app.use('/api/v2/campaigns', authenticatedRateLimiter, createCampaignRoutes(container));
  app.use('/api/v2/drafts', authenticatedRateLimiter, createDraftRoutes(container));

  // Error Handling
  app.use(expressErrorHandler);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  return app;
}
