import { z } from 'zod';

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  workspace_name: z.string().nullable(),
  actor_type: z.string(),
  actor_id: z.string().uuid().nullable(),
  actor_name: z.string().nullable(),
  actor_email: z.string().email().nullable(),
  action: z.string(),
  action_category: z.string(),
  platform: z.string().nullable(),
  campaign_id: z.string().uuid().nullable(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
  source: z.string().nullable(),
  ip_address: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const auditFilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  actor: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  actorType: z.string().optional(),
  actionCategory: z.string().optional(),
  entityType: z.string().optional(),
  search: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type AuditFilter = z.infer<typeof auditFilterSchema>;
