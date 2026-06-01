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
import { config, isProduction, corsOrigins } from '../../config';
import { requestLogger } from '../../middleware/requestLogger';
import { authenticatedRateLimiter, unauthenticatedRateLimiter } from '../../middleware/rateLimiter';
import { expressErrorHandler } from './middleware/errorHandler';

// Infrastructure
import { CampaignRepository } from '../../infrastructure/repositories/CampaignRepository';
import { DraftRepository } from '../../infrastructure/repositories/DraftRepository';
import { WorkspaceRepository } from '../../infrastructure/repositories/WorkspaceRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { BillingRepository } from '../../infrastructure/repositories/BillingRepository';
import { AdRepository } from '../../infrastructure/repositories/AdRepository';
import { SettingsRepository } from '../../infrastructure/repositories/SettingsRepository';
import { AudienceRepository } from '../../infrastructure/repositories/AudienceRepository';
import { ReportRepository } from '../../infrastructure/repositories/ReportRepository';
import { AlertRepository } from '../../infrastructure/repositories/AlertRepository';
import { SearchRepository } from '../../infrastructure/repositories/SearchRepository';
import { NotificationRepository } from '../../infrastructure/repositories/NotificationRepository';
import { WebhookRepository } from '../../infrastructure/repositories/WebhookRepository';
import { DraftCommentRepository } from '../../infrastructure/repositories/DraftCommentRepository';
import { CampaignInsightRepository } from '../../infrastructure/repositories/CampaignInsightRepository';
import { CampaignHistoryRepository } from '../../infrastructure/repositories/CampaignHistoryRepository';
import { AdSetRepository } from '../../infrastructure/repositories/AdSetRepository';
import { GoalRepository } from '../../infrastructure/repositories/GoalRepository';
import { AutomationRuleRepository } from '../../infrastructure/repositories/AutomationRuleRepository';
import { AuditLogRepository } from '../../infrastructure/repositories/AuditLogRepository';
import { ExportRepository } from '../../infrastructure/repositories/ExportRepository';
import { AssetRepository } from '../../infrastructure/repositories/AssetRepository';
import { InMemoryEventBus } from '../../domain/events/EventBus';
import { SupabaseAuditLogger } from '../../infrastructure/audit/SupabaseAuditLogger';
import { NotificationService } from '../../infrastructure/notification/NotificationService';

// Application
import { Container } from '../../application/services/Container';

// Routes
import { createAuthRoutes } from './routes/auth';
import { createCampaignRoutes } from './routes/campaigns';
import { createDraftRoutes } from './routes/drafts';
import { createBillingRoutes } from './routes/billing';
import { createAdRoutes } from './routes/ads';
import { createSettingsRoutes } from './routes/settings';
import { createAudienceRoutes } from './routes/audiences';
import { createReportRoutes } from './routes/reports';
import { createAlertRoutes } from './routes/alerts';
import { createSearchRoutes } from './routes/search';
import { createNotificationRoutes } from './routes/notifications';
import { createWebhookRoutes } from './routes/webhooks';
import { createAdSetRoutes } from './routes/ad-sets';
import { createGoalRoutes } from './routes/goals';
import { createAgentRoutes } from './routes/agent';
import { createAuditLogRoutes } from './routes/audit-log';
import { createExportRoutes } from './routes/exports';
import { createAssetRoutes } from './routes/assets';
import { createAdminRoutes } from './routes/admin';

// Legacy routes (to be migrated)
import authRoutes from '../../routes/auth';
import metaOAuthRoutes from '../../routes/auth/meta';
import googleOAuthRoutes from '../../routes/auth/google';

// OpenAPI
import { generateOpenAPIDocument } from '../../openapi/generator';

// Realtime
import { EventBus, createSSEHandler } from '../../realtime';

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
    origin: corsOrigins,
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
  const domainEventBus = new InMemoryEventBus();
  const auditLogger = new SupabaseAuditLogger();
  const notificationService = new NotificationService();
  const realtimeEventBus = new EventBus();

  const container = new Container({
    campaignRepository: new CampaignRepository(),
    draftRepository: new DraftRepository(),
    workspaceRepository: new WorkspaceRepository(),
    userRepository: new UserRepository(),
    billingRepository: new BillingRepository(),
    adRepository: new AdRepository(),
    settingsRepository: new SettingsRepository(),
    audienceRepository: new AudienceRepository(),
    reportRepository: new ReportRepository(),
    alertRepository: new AlertRepository(),
    searchRepository: new SearchRepository(),
    notificationRepository: new NotificationRepository(),
    webhookRepository: new WebhookRepository(),
    draftCommentRepository: new DraftCommentRepository(),
    campaignInsightRepository: new CampaignInsightRepository(),
    campaignHistoryRepository: new CampaignHistoryRepository(),
    adSetRepository: new AdSetRepository(),
    goalRepository: new GoalRepository(),
    automationRuleRepository: new AutomationRuleRepository(),
    auditLogRepository: new AuditLogRepository(),
    exportRepository: new ExportRepository(),
    assetRepository: new AssetRepository(),
    eventBus: domainEventBus,
    auditLogger,
    notificationService,
  });

  // Legacy Routes (v1, stable — OAuth, webhooks)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth/meta', metaOAuthRoutes);
  app.use('/api/v1/auth/google', googleOAuthRoutes);

  // V2 Clean Architecture Routes
  app.use('/api/v2/auth', unauthenticatedRateLimiter, createAuthRoutes());
  app.use('/api/v2/campaigns', authenticatedRateLimiter, createCampaignRoutes(container));
  app.use('/api/v2/drafts', authenticatedRateLimiter, createDraftRoutes(container));
  app.use('/api/v2/billing', authenticatedRateLimiter, createBillingRoutes(container));
  app.use('/api/v2/ads', authenticatedRateLimiter, createAdRoutes(container));
  app.use('/api/v2/settings', authenticatedRateLimiter, createSettingsRoutes(container));
  app.use('/api/v2/audiences', authenticatedRateLimiter, createAudienceRoutes(container));
  app.use('/api/v2/reports', authenticatedRateLimiter, createReportRoutes(container));
  app.use('/api/v2/alerts', authenticatedRateLimiter, createAlertRoutes(container));
  app.use('/api/v2/search', authenticatedRateLimiter, createSearchRoutes(container));
  app.use('/api/v2/notifications', authenticatedRateLimiter, createNotificationRoutes(container));
  app.use('/api/v2/webhooks', authenticatedRateLimiter, createWebhookRoutes(container));
  app.use('/api/v2/campaigns/:campaignId/adsets', authenticatedRateLimiter, createAdSetRoutes(container));
  app.use('/api/v2/goals', authenticatedRateLimiter, createGoalRoutes(container));
  app.use('/api/v2/agent', authenticatedRateLimiter, createAgentRoutes(container));
  app.use('/api/v2/audit-log', authenticatedRateLimiter, createAuditLogRoutes(container));
  app.use('/api/v2/exports', authenticatedRateLimiter, createExportRoutes(container));
  app.use('/api/v2/assets', authenticatedRateLimiter, createAssetRoutes(container));
  app.use('/api/v2/admin', authenticatedRateLimiter, createAdminRoutes(container));

  // Realtime SSE endpoint
  app.get('/api/v2/events', authenticatedRateLimiter, createSSEHandler(realtimeEventBus));

  // Realtime stats endpoint
  app.get('/api/v2/events/stats', authenticatedRateLimiter, (_req, res) => {
    res.json({ success: true, data: realtimeEventBus.getStats() });
  });

  // OpenAPI Spec & Documentation
  const openApiDocument = generateOpenAPIDocument();

  app.get('/api/v2/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiDocument);
  });

  app.get('/api/v2/docs', async (_req, res) => {
    const { apiReference } = await import('@scalar/express-api-reference');
    res.send(
      apiReference({
        spec: {
          content: openApiDocument,
        },
        theme: 'purple',
        layout: 'modern',
        metaData: {
          title: 'AdNexus AI API Documentation',
        },
      }),
    );
  });

  // Error Handling
  app.use(expressErrorHandler);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  return app;
}
