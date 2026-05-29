export interface AuditLogEntry {
  workspaceId: string | null;
  userId: string | null;
  actorType?: string;
  actorId?: string;
  actorName?: string;
  action: string;
  actionCategory?: string;
  platform?: string;
  campaignId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  source?: string;
  ipAddress?: string;
}

export interface IAuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
  logBatch(entries: AuditLogEntry[]): Promise<void>;
}
