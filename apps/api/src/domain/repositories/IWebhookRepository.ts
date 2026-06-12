import type { WebhookConfig } from '../entities/WebhookConfig';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  workspaceId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  responseStatus: number | null;
  responseBody: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface RecordWebhookDeliveryInput {
  webhookConfigId: string;
  workspaceId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  deliveryStatus: 'delivered' | 'failed' | 'pending';
}

export interface IWebhookRepository {
  listConfigs(workspaceId: string): Promise<WebhookConfig[]>;
  findConfigById(id: string): Promise<WebhookConfig | null>;
  findConfigByIdAndWorkspace(id: string, workspaceId: string): Promise<WebhookConfig | null>;
  createConfig(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig>;
  updateConfig(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null>;
  deleteConfig(id: string): Promise<boolean>;
  listDeliveries(webhookId: string): Promise<WebhookDelivery[]>;
  listDeliveriesForWorkspace(workspaceId: string, webhookId?: string): Promise<WebhookDelivery[]>;
  recordDelivery(input: RecordWebhookDeliveryInput): Promise<WebhookDelivery>;
}
