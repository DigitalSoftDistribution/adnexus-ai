import type { IWebhookRepository, WebhookDelivery, RecordWebhookDeliveryInput } from '../../domain/repositories/IWebhookRepository';
import type { WebhookConfig } from '../../domain/entities/WebhookConfig';
import { query } from '../database/connection';

export class WebhookRepository implements IWebhookRepository {
  async listConfigs(workspaceId: string): Promise<WebhookConfig[]> {
    const { rows } = await query<WebhookConfig>(
      `SELECT * FROM webhook_configs WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId],
    );
    return rows;
  }

  async findConfigById(id: string): Promise<WebhookConfig | null> {
    const { rows } = await query<WebhookConfig>(
      `SELECT * FROM webhook_configs WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findConfigByIdAndWorkspace(id: string, workspaceId: string): Promise<WebhookConfig | null> {
    const { rows } = await query<WebhookConfig>(
      `SELECT * FROM webhook_configs WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async createConfig(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig> {
    const { rows } = await query<WebhookConfig>(
      `INSERT INTO webhook_configs (workspace_id, name, url, events, secret, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        config.workspaceId, config.name, config.url,
        JSON.stringify(config.events), config.secret, config.status,
      ],
    );
    return rows[0];
  }

  async updateConfig(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let idx = 1;

    if (updates.name !== undefined) { setClauses.push(`name = $${++idx}`); params.push(updates.name); }
    if (updates.url !== undefined) { setClauses.push(`url = $${++idx}`); params.push(updates.url); }
    if (updates.events !== undefined) { setClauses.push(`events = $${++idx}`); params.push(JSON.stringify(updates.events)); }
    if (updates.secret !== undefined) { setClauses.push(`secret = $${++idx}`); params.push(updates.secret); }
    if (updates.status !== undefined) { setClauses.push(`status = $${++idx}`); params.push(updates.status); }

    if (setClauses.length === 0) return this.findConfigById(id);

    const { rows } = await query<WebhookConfig>(
      `UPDATE webhook_configs SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  }

  async deleteConfig(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM webhook_configs WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  private mapDeliveryRow(row: Record<string, unknown>): WebhookDelivery {
    const deliveryStatus = row.delivery_status as string;
    return {
      id: row.id as string,
      webhookId: row.webhook_config_id as string,
      workspaceId: row.workspace_id as string,
      event: row.event_type as string,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      status: deliveryStatus === 'delivered' ? 'success' : deliveryStatus === 'failed' ? 'failed' : 'pending',
      responseStatus: row.response_status === null || row.response_status === undefined
        ? null
        : Number(row.response_status),
      responseBody: (row.response_body ?? null) as string | null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
      createdAt: new Date(row.created_at as string),
    };
  }

  async listDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT id, webhook_config_id, workspace_id, event_type, payload,
              response_status, response_body, delivery_status, created_at, delivered_at
         FROM webhook_payloads
        WHERE webhook_config_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [webhookId],
    );
    return rows.map((row) => this.mapDeliveryRow(row));
  }

  async listDeliveriesForWorkspace(workspaceId: string, webhookId?: string): Promise<WebhookDelivery[]> {
    const conditions = ['workspace_id = $1'];
    const params: unknown[] = [workspaceId];
    if (webhookId) {
      conditions.push('webhook_config_id = $2');
      params.push(webhookId);
    }

    const { rows } = await query<Record<string, unknown>>(
      `SELECT id, webhook_config_id, workspace_id, event_type, payload,
              response_status, response_body, delivery_status, created_at, delivered_at
         FROM webhook_payloads
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT 50`,
      params,
    );
    return rows.map((row) => this.mapDeliveryRow(row));
  }

  async recordDelivery(input: RecordWebhookDeliveryInput): Promise<WebhookDelivery> {
    const deliveredAt = input.deliveryStatus === 'delivered' ? new Date() : null;
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO webhook_payloads (
         webhook_config_id, workspace_id, event_type, payload,
         response_status, response_body, delivery_status, delivered_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, webhook_config_id, workspace_id, event_type, payload,
                 response_status, response_body, delivery_status, created_at, delivered_at`,
      [
        input.webhookConfigId,
        input.workspaceId,
        input.eventType,
        JSON.stringify(input.payload),
        input.responseStatus,
        input.responseBody,
        input.deliveryStatus,
        deliveredAt,
      ],
    );
    return this.mapDeliveryRow(rows[0]);
  }
}
