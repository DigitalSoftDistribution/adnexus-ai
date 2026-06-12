import type { IAuditLogger, AuditLogEntry } from '../../application/ports/IAuditLogger';
import { supabase } from '../../lib/supabase';
import { getModuleLogger } from '../../lib/logger';

const logger = getModuleLogger('audit-logger');

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
    } catch (err) {
      // Audit logging should never fail the main operation. Log identifiers
      // only — entry metadata/details can carry the sensitive content the
      // audit trail exists to protect.
      logger.error(
        {
          err,
          workspaceId: entry.workspaceId,
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
        },
        'Audit log failed',
      );
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
    } catch (err) {
      logger.error(
        {
          err,
          count: entries.length,
          workspaceIds: [...new Set(entries.map((e) => e.workspaceId))],
        },
        'Batch audit log failed',
      );
    }
  }
}
