export type WebhookConfigStatus = 'active' | 'paused';

export interface WebhookConfig {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  status: WebhookConfigStatus;
  lastTriggeredAt: Date | null;
  failureCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
