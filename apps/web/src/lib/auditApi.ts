import { authFetchJson } from './authFetch';

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

/** A single audit log entry from the backend */
export interface AuditLogEntry {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  action_category: string;
  platform: string | null;
  campaign_id: string | null;
  details: Record<string, unknown> | null;
  source: string | null;
  ip_address: string | null;
}

/** Filters for audit log queries */
export interface AuditFilters {
  actorType: AuditActorType | 'all';
  actionCategory: AuditActionCategory | 'all';
  entityType: string;
  search: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

/** Paginated audit response */
export interface AuditResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ──────────────── API calls ──────────────── */

interface AuditListEnvelope {
  entries?: AuditLogEntry[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function auditParams(filters: Partial<AuditFilters>): Record<string, string | number | undefined> {
  return {
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    actorType: filters.actorType && filters.actorType !== 'all' ? filters.actorType : undefined,
    actionCategory:
      filters.actionCategory && filters.actionCategory !== 'all' ? filters.actionCategory : undefined,
    entityType: filters.entityType && filters.entityType !== 'all' ? filters.entityType : undefined,
    search: filters.search || undefined,
    dateFrom: filters.startDate,
    dateTo: filters.endDate,
  };
}

export const auditApi = {
  /** GET /api/v2/audit-log — List audit entries with filters */
  async list(filters: Partial<AuditFilters>): Promise<AuditResponse> {
    const response = await authFetchJson<AuditListEnvelope>('/api/v2/audit-log', {
      params: auditParams(filters),
    });
    const data = response.data ?? {};

    return {
      entries: data.entries ?? [],
      total: data.total ?? 0,
      page: data.page ?? filters.page ?? 1,
      limit: data.limit ?? filters.limit ?? 25,
      totalPages: data.totalPages ?? 1,
    };
  },

  async get(_id: string): Promise<AuditLogEntry> {
    throw new Error('Audit log detail is not available from the v2 API');
  },

  /** GET /api/v2/audit-log — Export filtered results to CSV client-side */
  async export(filters: Partial<AuditFilters>): Promise<string> {
    const result = await this.list({ ...filters, page: 1, limit: 1000 });
    const headers = [
      'id',
      'created_at',
      'actor_type',
      'actor_id',
      'actor_name',
      'action',
      'action_category',
      'platform',
      'campaign_id',
      'source',
      'ip_address',
    ];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = result.entries.map((entry) =>
      headers.map((key) => escape(entry[key as keyof AuditLogEntry])).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  },

  /** GET /api/v2/audit-log/summary — Get audit log statistics */
  async stats(): Promise<{
    total: number;
    today: number;
    categoryBreakdown: Array<{ category: string; count: number }>;
    actorBreakdown: Array<{ actorType: string; count: number }>;
  }> {
    const response = await authFetchJson<{
      total?: number;
      today?: number;
      categoryBreakdown?: Array<{ category: string; count: number }>;
      actorBreakdown?: Array<{ actorType: string; count: number }>;
    }>('/api/v2/audit-log/summary');
    const data = response.data ?? {};

    return {
      total: data.total ?? 0,
      today: data.today ?? 0,
      categoryBreakdown: data.categoryBreakdown ?? [],
      actorBreakdown: data.actorBreakdown ?? [],
    };
  },
};
