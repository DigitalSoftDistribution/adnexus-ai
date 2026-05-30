import type { IWebhookRepository, WebhookDelivery } from '../../domain/repositories/IWebhookRepository';
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

  async listDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    const { rows } = await query<WebhookDelivery>(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [webhookId],
    );
    return rows;
  }
}
