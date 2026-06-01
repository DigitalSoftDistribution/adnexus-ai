import type { WebhookConfig } from '../entities/WebhookConfig';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  responseStatus: number | null;
  responseBody: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface IWebhookRepository {
  listConfigs(workspaceId: string): Promise<WebhookConfig[]>;
  findConfigById(id: string): Promise<WebhookConfig | null>;
  createConfig(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig>;
  updateConfig(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null>;
  deleteConfig(id: string): Promise<boolean>;
  listDeliveries(webhookId: string): Promise<WebhookDelivery[]>;
}
