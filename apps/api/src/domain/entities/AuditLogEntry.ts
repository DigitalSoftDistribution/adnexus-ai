export interface AuditLogEntry {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  actorType: string | null;
  actorId: string | null;
  actorName: string | null;
  action: string;
  actionCategory: string | null;
  platform: string | null;
  campaignId: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  source: string | null;
  ipAddress: string | null;
  createdAt: Date;
}
