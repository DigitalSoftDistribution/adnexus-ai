import type { IAuditLogger, AuditLogEntry } from '../../application/ports/IAuditLogger';
import { supabase } from '../../lib/supabase';

export class SupabaseAuditLogger implements IAuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await supabase.from('audit_log').insert({
        workspace_id: entry.workspaceId,
        user_id: entry.userId,
        actor_type: entry.actorType,
        actor_id: entry.actorId,
        actor_name: entry.actorName,
        action: entry.action,
        action_category: entry.actionCategory,
        platform: entry.platform,
        campaign_id: entry.campaignId,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata,
        details: entry.details,
        source: entry.source,
        ip_address: entry.ipAddress,
      });
    } catch {
      // Audit logging should never fail the main operation
      // In production, send to a fallback (e.g., stdout, Sentry)
      console.error('Audit log failed:', entry);
    }
  }

  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      const rows = entries.map((entry) => ({
        workspace_id: entry.workspaceId,
        user_id: entry.userId,
        actor_type: entry.actorType,
        actor_id: entry.actorId,
        actor_name: entry.actorName,
        action: entry.action,
        action_category: entry.actionCategory,
        platform: entry.platform,
        campaign_id: entry.campaignId,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata,
        details: entry.details,
        source: entry.source,
        ip_address: entry.ipAddress,
      }));

      await supabase.from('audit_log').insert(rows);
    } catch {
      console.error('Batch audit log failed:', entries);
    }
  }
}
