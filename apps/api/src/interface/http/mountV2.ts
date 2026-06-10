/**
 * V2 Clean Architecture — Runtime Mount
 * =====================================
 * Builds the dependency-injection Container (composition root) and registers
 * every `/api/v2/*` route group onto a provided Express application.
 *
 * This is the single place where the v2 layer is wired for runtime. Both the
 * standalone `createServer()` factory and the production entrypoint
 * (`src/index.ts`, which serves v1) call `mountV2Routes()` so the v2 routes are
 * registered exactly once and identically in every host.
 *
 * The v2 routes carry their own authentication (`requireAuth`) and
 * authorization (`requireRole`) middleware, plus their own rate limiters, so
 * this mount is self-contained and MUST be applied BEFORE any global
 * `authenticateToken` gate the host installs for v1.
 */

import type { Express } from 'express';
import { Router as createRouter } from 'express';
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
import { AgentAdvisor } from '../../infrastructure/agent/AgentAdvisor';
import { CompositePlatformSyncService } from '../../infrastructure/platform/CompositePlatformSyncService';
import { GooglePlatformSyncService } from '../../infrastructure/platform/GooglePlatformSyncService';
import { MetaPlatformSyncService } from '../../infrastructure/platform/MetaPlatformSyncService';
import { MockSocialPlatformSyncService } from '../../infrastructure/platform/MockSocialPlatformSyncService';
import { MetaPlatformWriteService } from '../../infrastructure/platform/MetaPlatformWriteService';
import { MockTrafficSeeder } from '../../infrastructure/platform/MockTrafficSeeder';
import { AdAccountRepository } from '../../infrastructure/repositories/AdAccountRepository';
import { ScheduledReportRepository } from '../../infrastructure/repositories/ScheduledReportRepository';
import { SyncJobRepository } from '../../infrastructure/repositories/SyncJobRepository';
import { writeCampaignMetrics, stampAccountSynced, writeAdSets } from '../../infrastructure/platform/syncPersistence';
import { registerAllPlatformClients } from '../../platforms/register';
import { config } from '../../config';

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
import { createIntegrationRoutes } from './routes/integrations';
import { createMcpRoutes } from './routes/mcp';
import { createOnboardingRoutes } from './routes/onboarding';

// OpenAPI
import { generateOpenAPIDocument } from '../../openapi/generator';

// Realtime
import { EventBus, createSSEHandler } from '../../realtime';
import { requireAuthQuery } from './middleware/requireAuth';

/**
 * Build the v2 dependency-injection Container with concrete Supabase-backed
 * repositories. Construct once at boot and reuse for the process lifetime.
 */
export function buildContainer(): Container {
  const domainEventBus = new InMemoryEventBus();
  const auditLogger = new SupabaseAuditLogger();
  const notificationService = new NotificationService();
  const platformSyncService = new CompositePlatformSyncService([
    new MetaPlatformSyncService(),
    new GooglePlatformSyncService(),
    new MockSocialPlatformSyncService(config.socialSync.enableMockTikTokSnap),
  ]);

  return new Container({
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
    agentAdvisor: new AgentAdvisor(),
    platformSyncService,
    platformWriteService: new MetaPlatformWriteService(),
    adAccountRepository: new AdAccountRepository(),
    syncJobRepository: new SyncJobRepository(),
    scheduledReportRepository: new ScheduledReportRepository(),
    mockTrafficSeeder: new MockTrafficSeeder(),
    writeCampaignMetrics,
    stampAccountSynced,
    writeAdSets,
  });
}

export interface MountV2Options {
  /** Reuse an existing DI container; if omitted one is built via buildContainer(). */
  container?: Container;
  /** Reuse an existing realtime EventBus; if omitted a fresh one is created. */
  realtimeEventBus?: EventBus;
}

export interface MountedV2 {
  container: Container;
  realtimeEventBus: EventBus;
}

/**
 * Register all `/api/v2/*` routes (plus the v2 SSE/OpenAPI/docs handlers and a
 * v2-scoped error handler) onto `app`.
 *
 * The v2 error handler is mounted on an internal sub-router so it ONLY formats
 * errors originating from v2 routes (DomainError -> documented envelope),
 * leaving the host's global v1 error handler untouched for everything else.
 */
export function mountV2Routes(app: Express, options: MountV2Options = {}): MountedV2 {
  // Register platform client factories once so the PlatformManager can resolve
  // a client for any connected ad account (Meta, Google, TikTok, Snap).
  registerAllPlatformClients();

  const container = options.container ?? buildContainer();
  const realtimeEventBus = options.realtimeEventBus ?? new EventBus();

  const v2 = createRouter();

  // Auth is public (login/signup); everything else carries its own requireAuth.
  v2.use('/auth', unauthenticatedRateLimiter, createAuthRoutes());
  v2.use('/campaigns', authenticatedRateLimiter, createCampaignRoutes(container));
  v2.use('/drafts', authenticatedRateLimiter, createDraftRoutes(container));
  v2.use('/billing', authenticatedRateLimiter, createBillingRoutes(container));
  v2.use('/ads', authenticatedRateLimiter, createAdRoutes(container));
  v2.use('/settings', authenticatedRateLimiter, createSettingsRoutes(container));
  v2.use('/integrations', authenticatedRateLimiter, createIntegrationRoutes(container));
  v2.use('/mcp', authenticatedRateLimiter, createMcpRoutes(container));
  v2.use('/onboarding', authenticatedRateLimiter, createOnboardingRoutes(container));
  v2.use('/audiences', authenticatedRateLimiter, createAudienceRoutes(container));
  v2.use('/reports', authenticatedRateLimiter, createReportRoutes(container));
  v2.use('/alerts', authenticatedRateLimiter, createAlertRoutes(container));
  v2.use('/search', authenticatedRateLimiter, createSearchRoutes(container));
  v2.use('/notifications', authenticatedRateLimiter, createNotificationRoutes(container));
  v2.use('/webhooks', authenticatedRateLimiter, createWebhookRoutes(container));
  v2.use('/campaigns/:campaignId/adsets', authenticatedRateLimiter, createAdSetRoutes(container));
  v2.use('/goals', authenticatedRateLimiter, createGoalRoutes(container));
  v2.use('/agent', authenticatedRateLimiter, createAgentRoutes(container));
  v2.use('/audit-log', authenticatedRateLimiter, createAuditLogRoutes(container));
  v2.use('/exports', authenticatedRateLimiter, createExportRoutes(container));
  v2.use('/assets', authenticatedRateLimiter, createAssetRoutes(container));
  v2.use('/admin', authenticatedRateLimiter, createAdminRoutes(container));

  // Realtime SSE endpoint. EventSource can't send an Authorization header, so
  // the token arrives as a ?token= query param — requireAuthQuery handles both.
  v2.get('/events', authenticatedRateLimiter, requireAuthQuery, createSSEHandler(realtimeEventBus));

  // Realtime stats endpoint
  v2.get('/events/stats', authenticatedRateLimiter, (_req, res) => {
    res.json({ success: true, data: realtimeEventBus.getStats() });
  });

  // OpenAPI Spec & Documentation
  const openApiDocument = generateOpenAPIDocument();

  v2.get('/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiDocument);
  });

  v2.get('/docs', async (_req, res) => {
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

  // v2-scoped error handler — formats DomainError into the documented
  // { success:false, error:{code,message} } envelope for v2 routes only.
  v2.use(expressErrorHandler);

  app.use('/api/v2', v2);

  return { container, realtimeEventBus };
}
