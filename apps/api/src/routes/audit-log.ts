/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PIPEBOARD — Audit Log Routes                                            ║
 * ║                                                                          ║
 * ║  Provides read-only access to the audit_log table with filtering,        ║
 * ║  full-text search, cursor-based pagination, and CSV export.              ║
 * ║                                                                          ║
 * ║  Query filters:                                                          ║
 * ║    ?actor=<userId>      — Filter by actor ID                             ║
 * ║    ?action=<actionType> — Filter by exact action name                    ║
 * ║    ?resource=<type>     — Filter by entity_type or metadata.resource_type║
 * ║    ?resourceId=<id>     — Filter by entity_id or metadata.resource_id    ║
 * ║    ?from=<ISO>          — Filter entries created after this timestamp    ║
 * ║    ?to=<ISO>            — Filter entries created before this timestamp   ║
 * ║    ?actor_type=<type>   — Filter by actor type (ai/user/system/api)      ║
 * ║    ?action_category=<c> — Filter by action category                      ║
 * ║    ?entity_type=<type>  — Filter by entity type group                    ║
 * ║    ?search=<text>       — Full-text ilike across 6 columns               ║
 * ║    ?page=<N>            — Page number (offset-based)                     ║
 * ║    ?limit=<N>           — Page size (default 25, max 100)                ║
 * ║    ?cursor=<ISO>        — Cursor for cursor-based pagination             ║
 * ║                                                                          ║
 * ║  Endpoints:                                                              ║
 * ║    GET  /audit-log              — List entries with filters + pagination ║
 * ║    GET  /audit-log/:id          — Single audit entry detail              ║
 * ║    GET  /audit-log/export       — Export filtered results as CSV         ║
 * ║    GET  /audit-log/stats/summary — Audit log statistics                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../lib/errors';
import { getModuleLogger } from '../lib/logger';

const router = Router();
const logger = getModuleLogger('audit-log');

// ═══════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════

interface AuditLogEntry {
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

interface AuditListFilters {
  workspaceId: string;
  page: number;
  limit: number;
  cursor?: string;
  actor?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  actorType?: string;
  actionCategory?: string;
  entityType?: string;
  search?: string;
}

// ═══════════════════════════════════════════════════════════════
//  Validation Schemas
// ═══════════════════════════════════════════════════════════════

const listQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('25'),
  cursor: z.string().optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resource_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  actor_type: z.string().optional(),
  action_category: z.string().optional(),
  entity_type: z.string().optional(),
  search: z.string().optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(['csv']).default('csv'),
  actor: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resource_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  actor_type: z.string().optional(),
  action_category: z.string().optional(),
  entity_type: z.string().optional(),
  search: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════

const ENTITY_CATEGORY_MAP: Record<string, string[]> = {
  campaign: ['campaign_create', 'campaign_update', 'campaign_delete', 'status_change', 'budget_change'],
  draft: ['draft_created', 'draft_approved', 'draft_rejected', 'draft_create', 'draft_approve', 'draft_reject'],
  creative: ['creative_upload', 'creative_update', 'creative_delete'],
  rule: ['rule_triggered', 'rule_created', 'rule_updated', 'rule_deleted'],
  user: ['user_signup', 'user_login', 'user_invite', 'team_invite', 'user_update', 'user_delete'],
  setting: ['setting_change', 'settings_update'],
  agent: ['agent_action', 'agent_run'],
  webhook: ['webhook'],
};

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function deriveEntityType(actionCategory: string): string {
  if (!actionCategory) return 'unknown';

  if (actionCategory.startsWith('campaign_') || actionCategory === 'status_change' || actionCategory === 'budget_change') {
    return 'campaign';
  }
  if (actionCategory.startsWith('draft_')) return 'draft';
  if (actionCategory.startsWith('creative_')) return 'creative';
  if (actionCategory.startsWith('rule_')) return 'rule';
  if (actionCategory.startsWith('user_') || actionCategory === 'team_invite') return 'user';
  if (actionCategory.startsWith('setting_') || actionCategory === 'settings_update') return 'setting';
  if (actionCategory.startsWith('agent_')) return 'agent';
  if (actionCategory === 'webhook') return 'webhook';
  if (actionCategory.startsWith('approval_') || actionCategory.startsWith('rejection')) return 'approval';

  return 'unknown';
}

function buildFilteredQuery(filters: AuditListFilters) {
  let q = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('workspace_id', filters.workspaceId)
    .order('created_at', { ascending: false });

  if (filters.cursor) {
    q = q.lt('created_at', filters.cursor);
  }

  if (filters.actor) {
    q = q.eq('actor_id', filters.actor);
  }

  if (filters.action) {
    q = q.eq('action', filters.action);
  }

  if (filters.resource) {
    q = q.or(`entity_type.eq.${filters.resource},metadata->>resource_type.eq.${filters.resource}`);
  }

  if (filters.resourceId) {
    q = q.or(`entity_id.eq.${filters.resourceId},metadata->>resource_id.eq.${filters.resourceId}`);
  }

  const fromDate = filters.from || filters.startDate;
  const toDate = filters.to || filters.endDate;

  if (fromDate) {
    q = q.gte('created_at', fromDate);
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1);
    q = q.lt('created_at', end.toISOString());
  }

  if (filters.actorType && filters.actorType !== 'all') {
    q = q.eq('actor_type', filters.actorType);
  }

  if (filters.actionCategory && filters.actionCategory !== 'all') {
    q = q.eq('action_category', filters.actionCategory);
  }

  if (filters.entityType && filters.entityType !== 'all') {
    const categories = ENTITY_CATEGORY_MAP[filters.entityType];
    if (categories) {
      q = q.in('action_category', categories);
    }
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    q = q.or(
      `actor_name.ilike.%${s}%,action.ilike.%${s}%,campaign_id.ilike.%${s}%,entity_id.ilike.%${s}%,details::text.ilike.%${s}%,metadata::text.ilike.%${s}%`,
    );
  }

  return q;
}

async function enrichmentLookup(rows: Record<string, unknown>[]): Promise<{
  workspaceNames: Map<string, string>;
  actorEmails: Map<string, string>;
}> {
  const workspaceNames = new Map<string, string>();
  const actorEmails = new Map<string, string>();

  const workspaceIds = [...new Set(rows.map((r) => r.workspace_id as string).filter(Boolean))];
  const actorIds = [...new Set(rows.map((r) => r.actor_id as string).filter(Boolean))];

  if (workspaceIds.length > 0) {
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name')
      .in('id', workspaceIds.slice(0, 100));
    for (const ws of workspaces || []) {
      workspaceNames.set(ws.id as string, ws.name as string);
    }
  }

  if (actorIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('id', actorIds.slice(0, 100));
    for (const u of users || []) {
      actorEmails.set(u.id as string, u.email as string);
    }
  }

  return { workspaceNames, actorEmails };
}

function mapEnrichedRow(
  row: Record<string, unknown>,
  enrichment?: { workspaceNames: Map<string, string>; actorEmails: Map<string, string> },
): AuditLogEntry {
  const actionCategory = (row.action_category as string) || '';
  const entityType = (row.entity_type as string) || deriveEntityType(actionCategory);
  const entityId = (row.entity_id as string) || (row.campaign_id as string) || null;

  const metadata = (row.metadata as Record<string, unknown>) || {};
  const resourceType = (metadata.resource_type as string) || (row.entity_type as string) || null;
  const resourceId = (metadata.resource_id as string) || (row.entity_id as string) || null;

  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    workspace_name: enrichment?.workspaceNames.get(row.workspace_id as string) || null,
    actor_type: row.actor_type as string,
    actor_id: row.actor_id as string | null,
    actor_name: row.actor_name as string | null,
    actor_email: enrichment?.actorEmails.get(row.actor_id as string) || null,
    action: row.action as string,
    action_category: actionCategory,
    platform: row.platform as string | null,
    campaign_id: row.campaign_id as string | null,
    entity_type: entityType,
    entity_id: entityId,
    resource_type: resourceType,
    resource_id: resourceId,
    details: {
      ...((row.details as Record<string, unknown>) || {}),
      entity_type: entityType,
      entity_id: entityId,
      resource_type: resourceType,
      resource_id: resourceId,
    },
    source: row.source as string | null,
    ip_address: row.ip_address as string | null,
    created_at: row.created_at as string,
  };
}

function buildCsv(entries: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Workspace',
    'Actor Type',
    'Actor Name',
    'Actor Email',
    'Action',
    'Action Category',
    'Entity Type',
    'Entity ID',
    'Resource Type',
    'Resource ID',
    'Platform',
    'Source',
    'IP Address',
    'Details',
  ];

  const rows = entries.map((e) => [
    e.id,
    e.created_at,
    e.workspace_name || '',
    e.actor_type,
    e.actor_name || '',
    e.actor_email || '',
    e.action,
    e.action_category,
    e.entity_type,
    e.entity_id || '',
    e.resource_type || '',
    e.resource_id || '',
    e.platform || '',
    e.source || '',
    e.ip_address || '',
    JSON.stringify(e.details || {}).replace(/"/g, '""'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  GET /audit-log/export — Export to CSV (BEFORE /:id)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = exportQuerySchema.parse(req.query);

    const filters: AuditListFilters = {
      workspaceId,
      page: 1,
      limit: 10000,
      actor: parsed.actor,
      action: parsed.action,
      resource: parsed.resource,
      resourceId: parsed.resource_id,
      from: parsed.from || parsed.start_date,
      to: parsed.to || parsed.end_date,
      actorType: parsed.actor_type,
      actionCategory: parsed.action_category,
      entityType: parsed.entity_type,
      search: parsed.search,
    };

    logger.info({ filters }, 'Exporting audit log to CSV');

    const q = buildFilteredQuery(filters);
    const { data, error } = await q.limit(10000);

    if (error) {
      logger.error({ error }, 'Failed to export audit log');
      throw new ValidationError(`Export failed: ${error.message}`);
    }

    const enrichment = await enrichmentLookup(data || []);
    const entries = (data || []).map((row) => mapEnrichedRow(row, enrichment));
    const csv = buildCsv(entries);

    const filename = `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ═══════════════════════════════════════════════════════════════
//  GET /audit-log/stats/summary — Audit log statistics
// ═══════════════════════════════════════════════════════════════

router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    const { count: total, error: totalError } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (totalError) {
      logger.error({ error: totalError }, 'Failed to fetch audit log stats');
    }

    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount, error: todayError } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', today);

    if (todayError) {
      logger.error({ error: todayError }, 'Failed to fetch today audit log stats');
    }

    const { data: categoryBreakdown, error: catError } = await supabase
      .from('audit_log')
      .select('action_category')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

    if (catError) {
      logger.error({ error: catError }, 'Failed to fetch category breakdown');
    }

    const categoryCounts: Record<string, number> = {};
    for (const row of categoryBreakdown || []) {
      const cat = row.action_category || 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const { data: actorBreakdown, error: actorError } = await supabase
      .from('audit_log')
      .select('actor_type')
      .eq('workspace_id', workspaceId);

    if (actorError) {
      logger.error({ error: actorError }, 'Failed to fetch actor breakdown');
    }

    const actorCounts: Record<string, number> = {};
    for (const row of actorBreakdown || []) {
      const actor = row.actor_type || 'unknown';
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    }

    const { data: resourceBreakdown, error: resError } = await supabase
      .from('audit_log')
      .select('entity_type')
      .eq('workspace_id', workspaceId);

    if (resError) {
      logger.error({ error: resError }, 'Failed to fetch resource breakdown');
    }

    const resourceCounts: Record<string, number> = {};
    for (const row of resourceBreakdown || []) {
      const resource = (row.entity_type as string) || 'unknown';
      resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        total: total || 0,
        today: todayCount || 0,
        categoryBreakdown: Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15)
          .map(([category, count]) => ({ category, count })),
        actorBreakdown: Object.entries(actorCounts).map(([actorType, count]) => ({ actorType, count })),
        resourceBreakdown: Object.entries(resourceCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([resourceType, count]) => ({ resourceType, count })),
      },
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  GET /audit-log — List audit entries
// ═══════════════════════════════════════════════════════════════

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = listQuerySchema.parse(req.query);

    const filters: AuditListFilters = {
      workspaceId,
      page: Math.max(1, parsed.page),
      limit: Math.min(100, Math.max(1, parsed.limit)),
      cursor: parsed.cursor,
      actor: parsed.actor,
      action: parsed.action,
      resource: parsed.resource,
      resourceId: parsed.resource_id,
      from: parsed.from || parsed.start_date,
      to: parsed.to || parsed.end_date,
      actorType: parsed.actor_type,
      actionCategory: parsed.action_category,
      entityType: parsed.entity_type,
      search: parsed.search,
    };

    logger.debug(
      {
        page: filters.page,
        limit: filters.limit,
        cursor: filters.cursor,
        actor: filters.actor,
        action: filters.action,
        resource: filters.resource,
        resourceId: filters.resourceId,
        search: filters.search,
      },
      'Listing audit log entries',
    );

    const q = buildFilteredQuery(filters);

    if (filters.cursor) {
      const { data, error, count } = await q.limit(filters.limit);

      if (error) {
        logger.error({ error }, 'Failed to fetch audit log entries');
        throw new ValidationError(`Failed to fetch audit log: ${error.message}`);
      }

      const enrichment = await enrichmentLookup(data || []);
      const entries = (data || []).map((row) => mapEnrichedRow(row, enrichment));
      const total = count || 0;
      const nextCursor = entries.length === filters.limit ? entries[entries.length - 1]?.created_at : null;

      res.json({
        success: true,
        data: entries,
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        cursor: nextCursor,
        hasMore: entries.length === filters.limit,
      });
      return;
    }

    const offset = (filters.page - 1) * filters.limit;
    const { data, error, count } = await q.range(offset, offset + filters.limit - 1);

    if (error) {
      logger.error({ error }, 'Failed to fetch audit log entries');
      throw new ValidationError(`Failed to fetch audit log: ${error.message}`);
    }

    const enrichment = await enrichmentLookup(data || []);
    const entries = (data || []).map((row) => mapEnrichedRow(row, enrichment));
    const total = count || 0;
    const totalPages = Math.ceil(total / filters.limit);

    res.json({
      success: true,
      data: entries,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
    });
  }),
);

// ═══════════════════════════════════════════════════════════════
//  GET /audit-log/:id — Single audit entry (must be LAST)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      logger.warn({ id, error }, 'Audit log entry not found');
      throw new NotFoundError('Audit log entry');
    }

    const enrichment = await enrichmentLookup([data]);
    res.json({
      success: true,
      data: mapEnrichedRow(data, enrichment),
    });
  }),
);

export default router;
