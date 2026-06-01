/**
 * OpenAPI 3.1 Spec Generator
 *
 * Generates a complete OpenAPI specification from Zod schemas
 * using zod-openapi. Serves both Swagger UI (via Scalar) and
 * raw JSON spec.
 */

import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

// ─── Reusable Schema Components ──────────────────────────────

export const CampaignStatusSchema = z.enum(['active', 'paused', 'archived', 'draft', 'pending', 'deleted']).openapi({
  ref: 'CampaignStatus',
  description: 'Campaign lifecycle status',
});

export const PlatformSchema = z.enum(['meta', 'google', 'tiktok', 'snap']).openapi({
  ref: 'Platform',
  description: 'Advertising platform',
});

export const BudgetTypeSchema = z.enum(['daily', 'lifetime']).openapi({
  ref: 'BudgetType',
  description: 'Budget allocation type',
});

export const CampaignObjectiveSchema = z.enum([
  'awareness', 'traffic', 'engagement', 'leads', 'sales',
  'app_promotion', 'reach', 'video_views',
]).openapi({
  ref: 'CampaignObjective',
  description: 'Campaign optimization objective',
});

export const CampaignSchema = z.object({
  id: z.string().uuid().openapi({ description: 'Unique campaign identifier' }),
  workspaceId: z.string().uuid().openapi({ description: 'Owning workspace' }),
  adAccountId: z.string().uuid().openapi({ description: 'Linked ad account' }),
  platform: PlatformSchema,
  platformCampaignId: z.string().nullable().openapi({ description: 'Platform-native campaign ID' }),
  name: z.string().min(1).max(255).openapi({ description: 'Campaign name' }),
  status: CampaignStatusSchema,
  objective: CampaignObjectiveSchema.nullable(),
  budgetType: BudgetTypeSchema.nullable(),
  dailyBudget: z.number().nonnegative().nullable().openapi({ description: 'Daily budget in account currency' }),
  lifetimeBudget: z.number().nonnegative().nullable().openapi({ description: 'Lifetime budget in account currency' }),
  spend: z.number().nonnegative().openapi({ description: 'Total spend to date' }),
  impressions: z.number().int().nonnegative().openapi({ description: 'Total impressions' }),
  clicks: z.number().int().nonnegative().openapi({ description: 'Total clicks' }),
  ctr: z.number().nonnegative().nullable().openapi({ description: 'Click-through rate' }),
  conversions: z.number().int().nonnegative().openapi({ description: 'Total conversions' }),
  cpa: z.number().nonnegative().nullable().openapi({ description: 'Cost per acquisition' }),
  roas: z.number().nonnegative().nullable().openapi({ description: 'Return on ad spend' }),
  startDate: z.string().nullable().openapi({ description: 'Campaign start date (ISO 8601)' }),
  endDate: z.string().nullable().openapi({ description: 'Campaign end date (ISO 8601)' }),
  createdAt: z.string().datetime().openapi({ description: 'Creation timestamp' }),
  updatedAt: z.string().datetime().openapi({ description: 'Last update timestamp' }),
}).openapi({
  ref: 'Campaign',
  description: 'Advertising campaign',
});

export const CreateCampaignRequestSchema = z.object({
  adAccountId: z.string().uuid(),
  platform: PlatformSchema,
  name: z.string().min(2).max(255),
  status: CampaignStatusSchema,
  objective: CampaignObjectiveSchema.optional(),
  budgetType: BudgetTypeSchema.optional(),
  dailyBudget: z.number().nonnegative().optional(),
  lifetimeBudget: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict().openapi({
  ref: 'CreateCampaignRequest',
  description: 'Create campaign request body',
});

export const CampaignListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    campaigns: z.array(CampaignSchema),
    total: z.number().int(),
    page: z.number().int(),
    totalPages: z.number().int(),
  }),
}).openapi({
  ref: 'CampaignListResponse',
  description: 'Paginated campaign list response',
});

export const CampaignSummarySchema = z.object({
  success: z.literal(true),
  data: z.object({
    totalCampaigns: z.number().int(),
    activeCount: z.number().int(),
    pausedCount: z.number().int(),
    totalSpend: z.number(),
    totalImpressions: z.number(),
    totalClicks: z.number().int(),
    totalConversions: z.number().int(),
    avgCtr: z.number(),
    avgCpa: z.number(),
    avgRoas: z.number(),
    platformBreakdown: z.record(z.number().int()),
    statusBreakdown: z.record(z.number().int()),
  }),
}).openapi({
  ref: 'CampaignSummaryResponse',
  description: 'Campaign summary statistics',
});

export const DraftStatusSchema = z.enum(['pending', 'approved', 'rejected', 'executed', 'failed', 'rolled_back']).openapi({
  ref: 'DraftStatus',
  description: 'Draft lifecycle status',
});

export const DraftTypeSchema = z.enum([
  'budget_adjustment', 'bid_adjustment', 'audience_change', 'creative_swap',
  'schedule_change', 'status_change', 'campaign_creation', 'campaign_deletion',
  'rule_execution', 'ai_optimization', 'manual_edit',
]).openapi({
  ref: 'DraftType',
  description: 'Type of draft change',
});

export const DraftSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  platform: z.union([PlatformSchema, z.literal('all')]),
  campaignId: z.string().uuid().nullable(),
  adsetId: z.string().nullable(),
  adId: z.string().nullable(),
  draftType: DraftTypeSchema,
  changeSummary: z.string().min(5).max(500),
  changeDetail: z.record(z.unknown()),
  aiReasoning: z.string().nullable(),
  impactEstimate: z.string().nullable(),
  actorType: z.enum(['ai', 'user', 'system']),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  ruleId: z.string().nullable(),
  status: DraftStatusSchema,
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
  executedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({
  ref: 'Draft',
  description: 'Optimization draft',
});

export const CreateDraftRequestSchema = z.object({
  platform: z.union([PlatformSchema, z.literal('all')]),
  campaignId: z.string().uuid().optional(),
  adsetId: z.string().optional(),
  adId: z.string().optional(),
  draftType: DraftTypeSchema,
  changeSummary: z.string().min(5).max(500),
  changeDetail: z.record(z.unknown()),
  aiReasoning: z.string().optional(),
  impactEstimate: z.string().optional(),
  actorType: z.enum(['ai', 'user', 'system']).optional(),
  ruleId: z.string().optional(),
}).strict().openapi({
  ref: 'CreateDraftRequest',
  description: 'Create draft request body',
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
}).openapi({
  ref: 'ApiError',
  description: 'Standard API error response',
});

// ─── AdSet Schemas ───────────────────────────────────────────

export const AdSetStatusSchema = z.enum(['active', 'paused', 'archived', 'deleted']).openapi({
  ref: 'AdSetStatus',
  description: 'Ad set lifecycle status',
});

export const BidStrategySchema = z.enum(['lowest_cost', 'cost_cap', 'bid_cap', 'target_cost', 'highest_value']).openapi({
  ref: 'BidStrategy',
  description: 'Bidding strategy',
});

export const AdSetSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  platformAdSetId: z.string().nullable(),
  name: z.string(),
  status: AdSetStatusSchema,
  budget: z.number().nullable(),
  budgetType: z.enum(['daily', 'lifetime']).nullable(),
  bidStrategy: BidStrategySchema.nullable(),
  bidAmount: z.number().nullable(),
  targeting: z.record(z.unknown()).nullable(),
  spend: z.number(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  ctr: z.number().nullable(),
  conversions: z.number().int(),
  cpa: z.number().nullable(),
  roas: z.number().nullable(),
  cpm: z.number().nullable(),
  cpc: z.number().nullable(),
  frequency: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({
  ref: 'AdSet',
  description: 'Ad set within a campaign',
});

// ─── Goal Schemas ────────────────────────────────────────────

export const GoalMetricSchema = z.enum(['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'roas', 'cpa', 'reach', 'frequency']).openapi({
  ref: 'GoalMetric',
  description: 'Goal tracking metric',
});

export const GoalPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'campaign_lifetime']).openapi({
  ref: 'GoalPeriod',
  description: 'Goal measurement period',
});

export const GoalStatusSchema = z.enum(['active', 'paused', 'achieved', 'missed', 'archived']).openapi({
  ref: 'GoalStatus',
  description: 'Goal lifecycle status',
});

export const GoalSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  campaignId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  metric: GoalMetricSchema,
  targetValue: z.number(),
  currentValue: z.number(),
  period: GoalPeriodSchema,
  status: GoalStatusSchema,
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  alertThreshold: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({
  ref: 'Goal',
  description: 'Campaign goal',
});

// ─── Asset Schemas ───────────────────────────────────────────

export const AssetTypeSchema = z.enum(['image', 'video', 'document', 'csv', 'other']).openapi({
  ref: 'AssetType',
  description: 'Asset file type',
});

export const AssetStatusSchema = z.enum(['uploading', 'processing', 'ready', 'failed', 'archived']).openapi({
  ref: 'AssetStatus',
  description: 'Asset processing status',
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  originalName: z.string(),
  type: AssetTypeSchema,
  mimeType: z.string(),
  size: z.number().int(),
  url: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  status: AssetStatusSchema,
  metadata: z.record(z.unknown()).nullable(),
  campaignId: z.string().uuid().nullable(),
  adId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({
  ref: 'Asset',
  description: 'Media asset',
});

// ─── Export Schemas ──────────────────────────────────────────

export const ExportFormatSchema = z.enum(['csv', 'pdf', 'xlsx', 'json']).openapi({
  ref: 'ExportFormat',
  description: 'Export file format',
});

export const ExportStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).openapi({
  ref: 'ExportStatus',
  description: 'Export job status',
});

export const ExportEntitySchema = z.enum(['campaigns', 'ads', 'audiences', 'reports', 'audit_log', 'billing']).openapi({
  ref: 'ExportEntity',
  description: 'Export data entity',
});

export const ExportSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  entity: ExportEntitySchema,
  format: ExportFormatSchema,
  status: ExportStatusSchema,
  filters: z.record(z.unknown()).nullable(),
  fileUrl: z.string().nullable(),
  fileSize: z.number().nullable(),
  rowCount: z.number().nullable(),
  errorMessage: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({
  ref: 'Export',
  description: 'Data export job',
});

// ─── Audit Log Schemas ───────────────────────────────────────

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  actorType: z.string().nullable(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  actionCategory: z.string().nullable(),
  platform: z.string().nullable(),
  campaignId: z.string().uuid().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  details: z.record(z.unknown()).nullable(),
  source: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
}).openapi({
  ref: 'AuditLogEntry',
  description: 'Audit log entry',
});

// ─── OpenAPI Document ────────────────────────────────────────

export function generateOpenAPIDocument(): any {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'AdNexus AI API',
      description: 'Advertising campaign management and AI optimization platform API',
      version: '2.0.0',
      contact: {
        name: 'AdNexus AI Support',
        email: 'api@adnexus.ai',
      },
      license: {
        name: 'MIT',
        identifier: 'MIT',
      },
    },
    servers: [
      { url: 'https://api.adnexus.ai', description: 'Production' },
      { url: 'https://staging-api.adnexus.ai', description: 'Staging' },
      { url: 'http://localhost:3001', description: 'Local Development' },
    ],
    tags: [
      { name: 'Campaigns', description: 'Campaign CRUD and analytics' },
      { name: 'Drafts', description: 'Optimization drafts and approvals' },
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Workspaces', description: 'Workspace and team management' },
      { name: 'Reports', description: 'Reporting and analytics' },
      { name: 'Webhooks', description: 'Webhook configuration and delivery' },
      { name: 'AdSets', description: 'Ad set management' },
      { name: 'Goals', description: 'Campaign goals and tracking' },
      { name: 'Assets', description: 'File uploads and media assets' },
      { name: 'Exports', description: 'Data export jobs' },
      { name: 'AuditLog', description: 'Audit trail and activity log' },
      { name: 'Agent', description: 'AI Agent and automation rules' },
      { name: 'Admin', description: 'Admin operations' },
    ],
    paths: {
      '/api/v2/campaigns': {
        get: {
          tags: ['Campaigns'],
          summary: 'List campaigns',
          description: 'Get paginated campaigns for the authenticated workspace',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'created_at' } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': { description: 'Campaign list', content: { 'application/json': { schema: CampaignListResponseSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '429': { description: 'Rate limited', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
        post: {
          tags: ['Campaigns'],
          summary: 'Create campaign',
          description: 'Create a new advertising campaign',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: CreateCampaignRequestSchema } },
          },
          responses: {
            '201': { description: 'Campaign created', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: CampaignSchema }) } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/campaigns/summary': {
        get: {
          tags: ['Campaigns'],
          summary: 'Campaign summary',
          description: 'Get aggregate campaign statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Summary statistics', content: { 'application/json': { schema: CampaignSummarySchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/drafts': {
        post: {
          tags: ['Drafts'],
          summary: 'Create draft',
          description: 'Create an optimization draft',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: CreateDraftRequestSchema } },
          },
          responses: {
            '201': { description: 'Draft created', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: DraftSchema }) } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/drafts/{id}/approve': {
        post: {
          tags: ['Drafts'],
          summary: 'Approve draft',
          description: 'Approve a pending optimization draft',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Draft approved', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ id: z.string(), status: z.string() }) }) } } },
            '400': { description: 'Invalid status transition', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ApiErrorSchema } } },
            '404': { description: 'Draft not found', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/campaigns/{id}/adsets': {
        get: {
          tags: ['AdSets'],
          summary: 'List ad sets',
          description: 'Get ad sets for a campaign',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Ad set list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ adSets: z.array(AdSetSchema), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '404': { description: 'Campaign not found', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/campaigns/{id}/history': {
        get: {
          tags: ['Campaigns'],
          summary: 'Campaign history',
          description: 'Get change history for a campaign',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Change history', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ history: z.array(z.object({ id: z.string(), action: z.string(), userName: z.string().nullable(), details: z.record(z.unknown()).nullable(), createdAt: z.string() })), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '404': { description: 'Campaign not found', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/goals': {
        get: {
          tags: ['Goals'],
          summary: 'List goals',
          description: 'Get campaign goals',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Goal list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ goals: z.array(GoalSchema), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
        post: {
          tags: ['Goals'],
          summary: 'Create goal',
          description: 'Create a new campaign goal',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: z.object({ name: z.string(), metric: GoalMetricSchema, targetValue: z.number(), period: GoalPeriodSchema, campaignId: z.string().uuid().optional() }) } },
          },
          responses: {
            '201': { description: 'Goal created', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: GoalSchema }) } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/assets': {
        get: {
          tags: ['Assets'],
          summary: 'List assets',
          description: 'Get media assets',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Asset list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ assets: z.array(AssetSchema), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
        post: {
          tags: ['Assets'],
          summary: 'Create asset',
          description: 'Register a new asset',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: z.object({ name: z.string(), originalName: z.string(), type: AssetTypeSchema, mimeType: z.string(), size: z.number().int() }) } },
          },
          responses: {
            '201': { description: 'Asset created', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: AssetSchema }) } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/exports': {
        get: {
          tags: ['Exports'],
          summary: 'List exports',
          description: 'Get data export jobs',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Export list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ exports: z.array(ExportSchema), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
        post: {
          tags: ['Exports'],
          summary: 'Create export',
          description: 'Create a data export job',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: z.object({ name: z.string(), entity: ExportEntitySchema, format: ExportFormatSchema }) } },
          },
          responses: {
            '201': { description: 'Export created', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: ExportSchema }) } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ApiErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/audit-log': {
        get: {
          tags: ['AuditLog'],
          summary: 'List audit log',
          description: 'Get audit trail entries',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Audit log list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ entries: z.array(AuditLogEntrySchema), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/agent/rules': {
        get: {
          tags: ['Agent'],
          summary: 'List automation rules',
          description: 'Get AI automation rules',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Rule list', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ rules: z.array(z.object({ id: z.string(), name: z.string(), status: z.string() })), total: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
      '/api/v2/admin/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Platform stats',
          description: 'Get admin platform statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Platform stats', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ totalWorkspaces: z.number(), totalUsers: z.number(), totalCampaigns: z.number(), totalSpend: z.number() }) }) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ApiErrorSchema } } },
            '403': { description: 'Admin access required', content: { 'application/json': { schema: ApiErrorSchema } } },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT access token',
        },
      },
    },
  });
}
