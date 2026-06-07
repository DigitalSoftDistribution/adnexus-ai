export type McpToolMode = 'read' | 'draft' | 'approve' | 'admin';
export type McpToolStatus = 'implemented' | 'planned';

export type McpToolCategory =
  | 'workspace'
  | 'integrations'
  | 'campaigns'
  | 'metrics'
  | 'reports'
  | 'recommendations'
  | 'drafts_approvals'
  | 'audit'
  | 'sync';

export interface McpToolCatalogEntry {
  name: string;
  title: string;
  category: McpToolCategory;
  mode: McpToolMode;
  status: McpToolStatus;
  requiredScopes: string[];
  backendRoute: string | null;
  description: string;
}

export interface McpCatalogSummary {
  total: number;
  byStatus: Record<McpToolStatus, number>;
  byMode: Record<McpToolMode, number>;
  byCategory: Partial<Record<McpToolCategory, number>>;
}

export interface McpToolCatalogFilters {
  status?: string;
  mode?: string;
  category?: string;
}

export const MCP_V2_REQUIRED_CATEGORIES: McpToolCategory[] = [
  'workspace',
  'integrations',
  'campaigns',
  'metrics',
  'reports',
  'recommendations',
  'drafts_approvals',
  'audit',
  'sync',
];

export const MCP_V2_REQUIRED_SCOPES = [
  'mcp:read',
  'workspace:read',
  'integrations:read',
  'integrations:write',
  'campaigns:read',
  'campaigns:write',
  'ads:read',
  'metrics:read',
  'reports:read',
  'reports:write',
  'recommendations:read',
  'recommendations:write',
  'drafts:read',
  'drafts:write',
  'approvals:write',
  'audit:read',
  'exports:write',
  'sync:read',
  'sync:write',
];

export const MCP_V2_SAFETY_MODEL = {
  defaultWriteMode: 'draft_first',
  directPlatformWritesFromMcp: false,
  approvalRequiredForWrites: true,
  auditRequiredForEveryToolCall: true,
} as const;

export const MCP_V2_GAPS = [
  'Production Streamable HTTP MCP endpoint is not implemented in the Node API yet.',
  'API key backend still needs scope-aware auth middleware for mcp_* keys and per-tool authorization.',
  'Every MCP call needs persistent audit logging with actor_type=mcp and tool/result metadata.',
  'Live platform write execution must remain behind approved drafts and backend execution guardrails.',
  'Metrics query normalization across Meta, Google, TikTok, and Snap needs a dedicated read model.',
];

export const MCP_V2_TOOL_CATALOG: McpToolCatalogEntry[] = [
  {
    name: 'workspace_get_context',
    title: 'Get workspace context',
    category: 'workspace',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['workspace:read'],
    backendRoute: 'GET /api/v2/settings/workspace',
    description: 'Return workspace identity, plan, branding, settings, and user role context for safe follow-up tool calls.',
  },
  {
    name: 'workspace_list_members',
    title: 'List workspace members',
    category: 'workspace',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['workspace:read'],
    backendRoute: 'GET /api/v2/settings/team',
    description: 'List team members and roles so assistants can explain approval ownership and escalation paths.',
  },
  {
    name: 'integration_list_accounts',
    title: 'List connected ad accounts',
    category: 'integrations',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['integrations:read'],
    backendRoute: 'GET /api/v2/integrations/accounts',
    description: 'List Meta, Google, TikTok, and Snap accounts connected to the workspace with sync status.',
  },
  {
    name: 'integration_get_account',
    title: 'Get ad account details',
    category: 'integrations',
    mode: 'read',
    status: 'planned',
    requiredScopes: ['integrations:read'],
    backendRoute: null,
    description: 'Fetch one connected account, token health, platform account metadata, and last successful sync summary.',
  },
  {
    name: 'integration_disconnect_draft',
    title: 'Draft integration disconnect',
    category: 'integrations',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['integrations:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage, but do not execute, a disconnect/revoke-token action for human approval.',
  },
  {
    name: 'campaign_list',
    title: 'List campaigns',
    category: 'campaigns',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['campaigns:read'],
    backendRoute: 'GET /api/v2/campaigns',
    description: 'List campaigns across Meta, Google, TikTok, and Snap with platform, status, search, sort, and pagination filters.',
  },
  {
    name: 'campaign_get',
    title: 'Get campaign details',
    category: 'campaigns',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['campaigns:read'],
    backendRoute: 'GET /api/v2/campaigns/:id',
    description: 'Return campaign configuration, targeting, budget, status, and linked platform account details.',
  },
  {
    name: 'campaign_get_summary',
    title: 'Get campaign summary',
    category: 'campaigns',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['campaigns:read'],
    backendRoute: 'GET /api/v2/campaigns/summary',
    description: 'Return aggregate campaign counts and spend/performance overview for the dashboard.',
  },
  {
    name: 'campaign_create_draft',
    title: 'Draft campaign creation',
    category: 'campaigns',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['campaigns:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage a new platform campaign as a draft with normalized cross-platform fields and platform-specific payload preview.',
  },
  {
    name: 'campaign_update_draft',
    title: 'Draft campaign update',
    category: 'campaigns',
    mode: 'draft',
    status: 'implemented',
    requiredScopes: ['campaigns:write', 'drafts:write'],
    backendRoute: 'POST /api/v2/drafts',
    description: 'Stage budget, status, schedule, bid strategy, naming, or targeting changes for approval instead of direct execution.',
  },
  {
    name: 'campaign_pause_draft',
    title: 'Draft campaign pause',
    category: 'campaigns',
    mode: 'draft',
    status: 'implemented',
    requiredScopes: ['campaigns:write', 'drafts:write'],
    backendRoute: 'POST /api/v2/drafts',
    description: 'Stage a campaign pause as a draft; no live platform write occurs until approval execution exists.',
  },
  {
    name: 'ad_list',
    title: 'List ads',
    category: 'campaigns',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['ads:read'],
    backendRoute: 'GET /api/v2/ads',
    description: 'List ads/creatives by campaign, platform, status, and search terms.',
  },
  {
    name: 'ad_get_performance',
    title: 'Get ad performance',
    category: 'metrics',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['metrics:read'],
    backendRoute: 'GET /api/v2/ads/:id/performance',
    description: 'Return ad-level spend, impressions, clicks, conversions, CPA, ROAS, and creative performance data.',
  },
  {
    name: 'metrics_query',
    title: 'Query performance metrics',
    category: 'metrics',
    mode: 'read',
    status: 'planned',
    requiredScopes: ['metrics:read'],
    backendRoute: null,
    description: 'Query normalized Meta, Google, TikTok, and Snap time-series metrics with dimensions and attribution windows.',
  },
  {
    name: 'metrics_compare_platforms',
    title: 'Compare platform metrics',
    category: 'metrics',
    mode: 'read',
    status: 'planned',
    requiredScopes: ['metrics:read'],
    backendRoute: null,
    description: 'Compare spend, conversion, CPA, CTR, and ROAS across Meta, Google, TikTok, and Snap for a date range.',
  },
  {
    name: 'report_list',
    title: 'List reports',
    category: 'reports',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['reports:read'],
    backendRoute: 'GET /api/v2/reports',
    description: 'List saved and scheduled reports available to the workspace.',
  },
  {
    name: 'report_get',
    title: 'Get report',
    category: 'reports',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['reports:read'],
    backendRoute: 'GET /api/v2/reports/:id',
    description: 'Fetch report configuration, generated output metadata, and schedule settings.',
  },
  {
    name: 'report_run_draft',
    title: 'Draft report run/export',
    category: 'reports',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['reports:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage a report generation/export request when it may create files, notify people, or consume credits.',
  },
  {
    name: 'export_create_draft',
    title: 'Draft export creation',
    category: 'reports',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['exports:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage campaign, ad, audience, report, billing, or audit-log exports with filters and destination metadata.',
  },
  {
    name: 'recommendation_list',
    title: 'List AI recommendations',
    category: 'recommendations',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['recommendations:read'],
    backendRoute: 'GET /api/v2/agent/recommendations',
    description: 'List optimization recommendations generated by the AI advisor.',
  },
  {
    name: 'recommendation_generate',
    title: 'Generate recommendations',
    category: 'recommendations',
    mode: 'draft',
    status: 'implemented',
    requiredScopes: ['recommendations:write', 'drafts:write'],
    backendRoute: 'POST /api/v2/agent/recommendations',
    description: 'Generate recommendations that can create drafts, not direct platform writes.',
  },
  {
    name: 'draft_list',
    title: 'List drafts',
    category: 'drafts_approvals',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['drafts:read'],
    backendRoute: 'GET /api/v2/drafts',
    description: 'List pending, approved, rejected, and executed drafts with pagination and status filters.',
  },
  {
    name: 'draft_get',
    title: 'Get draft details',
    category: 'drafts_approvals',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['drafts:read'],
    backendRoute: 'GET /api/v2/drafts/:id',
    description: 'Return draft diff, reasoning, risk, impact estimate, comments, and audit context.',
  },
  {
    name: 'draft_create',
    title: 'Create draft',
    category: 'drafts_approvals',
    mode: 'draft',
    status: 'implemented',
    requiredScopes: ['drafts:write'],
    backendRoute: 'POST /api/v2/drafts',
    description: 'Create a normalized draft for any proposed write action; this is the default MCP write model.',
  },
  {
    name: 'draft_approve',
    title: 'Approve draft',
    category: 'drafts_approvals',
    mode: 'approve',
    status: 'implemented',
    requiredScopes: ['approvals:write'],
    backendRoute: 'POST /api/v2/drafts/:id/approve',
    description: 'Approve a pending draft. V2 approval records intent; live execution remains bounded by backend execution readiness.',
  },
  {
    name: 'draft_reject',
    title: 'Reject draft',
    category: 'drafts_approvals',
    mode: 'approve',
    status: 'implemented',
    requiredScopes: ['approvals:write'],
    backendRoute: 'POST /api/v2/drafts/:id/reject',
    description: 'Reject a pending draft with a reason for auditability and assistant feedback loops.',
  },
  {
    name: 'audit_list',
    title: 'List audit events',
    category: 'audit',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['audit:read'],
    backendRoute: 'GET /api/v2/audit-log',
    description: 'List workspace audit events with actor, action category, entity, search, and date filters.',
  },
  {
    name: 'audit_get',
    title: 'Get audit event',
    category: 'audit',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['audit:read'],
    backendRoute: 'GET /api/v2/audit-log/:id',
    description: 'Fetch one audit event and its structured details.',
  },
  {
    name: 'audit_export_draft',
    title: 'Draft audit export',
    category: 'audit',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['audit:read', 'exports:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage an audit log export request rather than generating or sending files directly from an MCP tool.',
  },
  {
    name: 'sync_list_jobs',
    title: 'List sync jobs',
    category: 'sync',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['sync:read'],
    backendRoute: 'GET /api/v2/integrations/sync-jobs',
    description: 'List platform sync jobs and recent status for connected ad accounts.',
  },
  {
    name: 'sync_account_draft',
    title: 'Draft account sync',
    category: 'sync',
    mode: 'draft',
    status: 'planned',
    requiredScopes: ['sync:write', 'drafts:write'],
    backendRoute: null,
    description: 'Stage a potentially expensive or rate-limited account sync for approval or scheduled execution.',
  },
  {
    name: 'mcp_get_status',
    title: 'Get MCP status',
    category: 'audit',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['mcp:read'],
    backendRoute: 'GET /api/v2/mcp/status',
    description: 'Return user-facing MCP readiness, transport plan, catalog counts, and implementation gaps.',
  },
  {
    name: 'mcp_list_tools',
    title: 'List MCP tools',
    category: 'audit',
    mode: 'read',
    status: 'implemented',
    requiredScopes: ['mcp:read'],
    backendRoute: 'GET /api/v2/mcp/tools',
    description: 'Return this read-first, draft-first MCP V2 tool catalog for dashboard and docs surfaces.',
  },
];

export function summarizeMcpCatalog(tools: readonly McpToolCatalogEntry[] = MCP_V2_TOOL_CATALOG): McpCatalogSummary {
  return tools.reduce<McpCatalogSummary>(
    (summary, tool) => {
      summary.total += 1;
      summary.byStatus[tool.status] += 1;
      summary.byMode[tool.mode] += 1;
      summary.byCategory[tool.category] = (summary.byCategory[tool.category] ?? 0) + 1;
      return summary;
    },
    {
      total: 0,
      byStatus: { implemented: 0, planned: 0 },
      byMode: { read: 0, draft: 0, approve: 0, admin: 0 },
      byCategory: {},
    },
  );
}

export function filterMcpCatalog(filters: McpToolCatalogFilters): McpToolCatalogEntry[] {
  return MCP_V2_TOOL_CATALOG.filter((tool) => {
    if (filters.status && tool.status !== filters.status) return false;
    if (filters.mode && tool.mode !== filters.mode) return false;
    if (filters.category && tool.category !== filters.category) return false;
    return true;
  });
}

export function getMcpStatusMetadata() {
  return {
    status: 'planning_and_safe_api_slice_ready',
    version: '2.0',
    liveTransport: false,
    transports: {
      recommended: 'streamable_http',
      currentAppServer: 'https://<app-domain>/api/v2/mcp',
      legacyServer: 'apps/mcp FastMCP stdio/sse/http proxy exists but is not wired as the production user-facing transport',
    },
    safetyModel: MCP_V2_SAFETY_MODEL,
    scopes: MCP_V2_REQUIRED_SCOPES,
    catalog: summarizeMcpCatalog(),
    gaps: MCP_V2_GAPS,
  };
}
