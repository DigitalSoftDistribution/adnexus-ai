import api from './api';

/** Actor type for audit entries */
export type AuditActorType = 'ai' | 'user' | 'system' | 'api';

/** Action category for audit entries */
export type AuditActionCategory =
  | 'campaign_create'
  | 'campaign_update'
  | 'campaign_delete'
  | 'budget_change'
  | 'status_change'
  | 'creative_upload'
  | 'rule_triggered'
  | 'approval_given'
  | 'rejection'
  | 'agent_action'
  | 'agent_run'
  | 'draft_create'
  | 'draft_created'
  | 'draft_approve'
  | 'draft_approved'
  | 'draft_reject'
  | 'draft_rejected'
  | 'team_invite'
  | 'user_signup'
  | 'user_login'
  | 'user_invite'
  | 'login'
  | 'setting_change'
  | 'settings_update'
  | 'webhook';

/** A single audit log entry from the backend (enriched) */
export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  workspace_name: string | null;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  action_category: string;
  platform: string | null;
  campaign_id: string | null;
  entity_type: string;
  entity_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  source: string | null;
  ip_address: string | null;
  created_at: string;
}

/** Filters for audit log queries */
export interface AuditFilters {
  /** Filter by actor ID (UUID) */
  actor?: string;
  /** Filter by exact action name */
  action?: string;
  /** Filter by entity_type or metadata.resource_type */
  resource?: string;
  /** Filter by entity_id or metadata.resource_id */
  resourceId?: string;
  /** Filter entries created after ISO timestamp */
  from?: string;
  /** Filter entries created before ISO timestamp */
  to?: string;
  actorType: AuditActorType | 'all';
  actionCategory: AuditActionCategory | 'all';
  entityType: string;
  search: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  /** Cursor for cursor-based pagination (ISO timestamp) */
  cursor?: string;
}

/** Paginated audit response */
export interface AuditResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Next cursor for cursor-based pagination */
  cursor?: string | null;
  hasMore?: boolean;
}

/* ──────────────── API calls ──────────────── */

export const auditApi = {
  /** GET /api/v1/audit-log — List audit entries with filters */
  async list(filters: Partial<AuditFilters>): Promise<AuditResponse> {
    const params: Record<string, unknown> = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 25,
    };

    if (filters.actor) params.actor = filters.actor;
    if (filters.action) params.action = filters.action;
    if (filters.resource) params.resource = filters.resource;
    if (filters.resourceId) params.resource_id = filters.resourceId;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.cursor) params.cursor = filters.cursor;
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    if (filters.actorType && filters.actorType !== 'all') {
      params.actor_type = filters.actorType;
    }
    if (filters.actionCategory && filters.actionCategory !== 'all') {
      params.action_category = filters.actionCategory;
    }
    if (filters.entityType && filters.entityType !== 'all') {
      params.entity_type = filters.entityType;
    }
    if (filters.search) params.search = filters.search;

    const response = await api.get('/audit-log', { params });
    return {
      entries: response.data.data ?? [],
      total: response.data.total ?? 0,
      page: response.data.page ?? 1,
      limit: response.data.limit ?? 25,
      totalPages: response.data.totalPages ?? 1,
      cursor: response.data.cursor ?? null,
      hasMore: response.data.hasMore ?? false,
    };
  },

  /** GET /api/v1/audit-log/:id — Get a single audit entry */
  async get(id: string): Promise<AuditLogEntry> {
    const response = await api.get(`/audit-log/${id}`);
    return response.data.data;
  },

  /** GET /api/v1/audit-log/export — Export filtered results to CSV */
  async export(filters: Partial<AuditFilters>): Promise<string> {
    const params: Record<string, unknown> = {};

    if (filters.actor) params.actor = filters.actor;
    if (filters.action) params.action = filters.action;
    if (filters.resource) params.resource = filters.resource;
    if (filters.resourceId) params.resource_id = filters.resourceId;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    if (filters.actorType && filters.actorType !== 'all') {
      params.actor_type = filters.actorType;
    }
    if (filters.actionCategory && filters.actionCategory !== 'all') {
      params.action_category = filters.actionCategory;
    }
    if (filters.entityType && filters.entityType !== 'all') {
      params.entity_type = filters.entityType;
    }
    if (filters.search) params.search = filters.search;

    const response = await api.get('/audit-log/export', {
      params,
      responseType: 'text',
    });
    return response.data;
  },

  /** GET /api/v1/audit-log/stats/summary — Get audit log statistics */
  async stats(): Promise<{
    total: number;
    today: number;
    categoryBreakdown: Array<{ category: string; count: number }>;
    actorBreakdown: Array<{ actorType: string; count: number }>;
    resourceBreakdown: Array<{ resourceType: string; count: number }>;
  }> {
    const response = await api.get('/audit-log/stats/summary');
    return response.data.data;
  },
};
