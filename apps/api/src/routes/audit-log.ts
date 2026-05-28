/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ADNEXUS — Audit Log Routes                                              ║
 * ║                                                                          ║
 * ║  Provides read-only access to the audit_log table with filtering,        ║
 * ║  pagination, search, and CSV export.                                     ║
 * ║                                                                          ║
 * ║  Endpoints:                                                              ║
 * ║    GET  /audit-log       — List audit entries with filters + pagination  ║
 * ║    GET  /audit-log/:id   — Single audit entry detail                     ║
 * ║    GET  /audit-log/export — Export filtered results to CSV               ║
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
  created_at: string;
}

interface AuditListFilters {
  workspaceId: string;
  page: number;
  limit: number;
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
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  actor_type: z.string().optional(),
  action_category: z.string().optional(),
  entity_type: z.string().optional(),
  search: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Build a Supabase query for audit_log with all filters applied.
 */
function buildFilteredQuery(filters: AuditListFilters) {
  let q = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('workspace_id', filters.workspaceId)
    .order('created_at', { ascending: false });

  // Date range filter
  if (filters.startDate) {
    q = q.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    // Add one day to include the full end date
    const end = new Date(filters.endDate);
    end.setDate(end.getDate() + 1);
    q = q.lt('created_at', end.toISOString());
  }

  // Actor type filter
  if (filters.actorType && filters.actorType !== 'all') {
    q = q.eq('actor_type', filters.actorType);
  }

  // Action category filter
  if (filters.actionCategory && filters.actionCategory !== 'all') {
    q = q.eq('action_category', filters.actionCategory);
  }

  // Entity type filter — map to action_category prefixes
  if (filters.entityType && filters.entityType !== 'all') {
    const entityCategoryMap: Record<string, string[]> = {
      campaign: ['campaign_create', 'campaign_update', 'campaign_delete', 'status_change', 'budget_change'],
      draft: ['draft_created', 'draft_approved', 'draft_rejected', 'draft_create', 'draft_approve', 'draft_reject'],
      creative: ['creative_upload', 'creative_update', 'creative_delete'],
      rule: ['rule_triggered', 'rule_created', 'rule_updated', 'rule_deleted'],
      user: ['user_signup', 'user_login', 'user_invite', 'team_invite', 'user_update', 'user_delete'],
      setting: ['setting_change', 'settings_update'],
      agent: ['agent_action', 'agent_run'],
      webhook: ['webhook'],
    };
    const categories = entityCategoryMap[filters.entityType];
    if (categories) {
      q = q.in('action_category', categories);
    }
  }

  // Search — match actor_name, action, campaign_id, or details
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    q = q.or(`actor_name.ilike.%${s}%,action.ilike.%${s}%,campaign_id.ilike.%${s}%,details::text.ilike.%${s}%`);
  }

  return q;
}

/**
 * Map a raw audit_log row to the API response shape.
 */
function mapAuditEntry(row: Record<string, unknown>): AuditLogEntry {
  const details = row.details as Record<string, unknown> | null;

  // Derive entity type and ID from the row
  const actionCategory = (row.action_category as string) || '';
  let entityType = 'unknown';
  let entityId = (row.campaign_id as string) || null;

  if (actionCategory.startsWith('campaign_') || actionCategory === 'status_change' || actionCategory === 'budget_change') {
    entityType = 'campaign';
  } else if (actionCategory.startsWith('draft_')) {
    entityType = 'draft';
    if (!entityId && details?.draft_id) {
      entityId = details.draft_id as string;
    }
  } else if (actionCategory.startsWith('creative_')) {
    entityType = 'creative';
  } else if (actionCategory.startsWith('rule_')) {
    entityType = 'rule';
  } else if (actionCategory.startsWith('user_') || actionCategory === 'team_invite') {
    entityType = 'user';
  } else if (actionCategory.startsWith('setting_') || actionCategory === 'settings_update') {
    entityType = 'setting';
  } else if (actionCategory.startsWith('agent_')) {
    entityType = 'agent';
  } else if (actionCategory === 'webhook') {
    entityType = 'webhook';
  } else if (actionCategory.startsWith('approval_') || actionCategory.startsWith('rejection')) {
    entityType = 'approval';
  }

  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    actor_type: row.actor_type as string,
    actor_id: row.actor_id as string | null,
    actor_name: row.actor_name as string | null,
    action: row.action as string,
    action_category: actionCategory,
    platform: row.platform as string | null,
    campaign_id: row.campaign_id as string | null,
    details: {
      ...((row.details as Record<string, unknown>) || {}),
      entity_type: entityType,
      entity_id: entityId,
    },
    source: row.source as string | null,
    ip_address: row.ip_address as string | null,
    created_at: row.created_at as string,
  };
}

/**
 * Build CSV string from audit entries.
 */
function buildCsv(entries: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Actor Type',
    'Actor Name',
    'Action',
    'Action Category',
    'Entity Type',
    'Entity ID',
    'Platform',
    'Source',
    'IP Address',
    'Details',
  ];

  const rows = entries.map((e) => [
    e.id,
    e.created_at,
    e.actor_type,
    e.actor_name || '',
    e.action,
    e.action_category,
    e.details?.entity_type || '',
    (e.details?.entity_id as string) || '',
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
    const parsed = listQuerySchema.parse(req.query);

    const filters: AuditListFilters = {
      workspaceId,
      page: 1,
      limit: 10000, // Max export size
      startDate: parsed.start_date,
      endDate: parsed.end_date,
      actorType: parsed.actor_type,
      actionCategory: parsed.action_category,
      entityType: parsed.entity_type,
      search: parsed.search,
    };

    logger.info({ filters }, 'Exporting audit log to CSV');

    const q = buildFilteredQuery(filters);
    const { data, error, count } = await q.limit(10000);

    if (error) {
      logger.error({ error }, 'Failed to export audit log');
      throw new ValidationError(`Export failed: ${error.message}`);
    }

    const entries = (data || []).map(mapAuditEntry);
    const csv = buildCsv(entries);

    const filename = `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ═══════════════════════════════════════════════════════════════
//  GET /audit-log/stats/summary — Audit log statistics (BEFORE /:id)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // Total entries
    const { count: total, error: totalError } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (totalError) {
      logger.error({ error: totalError }, 'Failed to fetch audit log stats');
    }

    // Entries today
    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount, error: todayError } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', today);

    if (todayError) {
      logger.error({ error: todayError }, 'Failed to fetch today audit log stats');
    }

    // Action category breakdown (top 10)
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

    // Actor type breakdown
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

    res.json({
      success: true,
      data: {
        total: total || 0,
        today: todayCount || 0,
        categoryBreakdown: Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([category, count]) => ({ category, count })),
        actorBreakdown: Object.entries(actorCounts).map(([actorType, count]) => ({ actorType, count })),
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
      startDate: parsed.start_date,
      endDate: parsed.end_date,
      actorType: parsed.actor_type,
      actionCategory: parsed.action_category,
      entityType: parsed.entity_type,
      search: parsed.search,
    };

    logger.debug(
      { page: filters.page, limit: filters.limit, actorType: filters.actorType, search: filters.search },
      'Listing audit log entries',
    );

    const q = buildFilteredQuery(filters);
    const offset = (filters.page - 1) * filters.limit;
    const { data, error, count } = await q.range(offset, offset + filters.limit - 1);

    if (error) {
      logger.error({ error }, 'Failed to fetch audit log entries');
      throw new ValidationError(`Failed to fetch audit log: ${error.message}`);
    }

    const entries = (data || []).map(mapAuditEntry);
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

    res.json({
      success: true,
      data: mapAuditEntry(data),
    });
  }),
);

export default router;
