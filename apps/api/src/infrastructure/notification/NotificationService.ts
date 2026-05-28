import type { INotificationService, NotificationPayload } from '../../application/ports/INotificationService';
import { supabase } from '../../lib/supabase';

export class NotificationService implements INotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    // Store in-app notification
    await supabase.from('notifications').insert({
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      metadata: payload.metadata,
      read: false,
    });

    // Send to channels if configured
    for (const channel of payload.channels ?? []) {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(payload, channel.config);
          break;
        case 'slack':
          await this.sendSlack(payload, channel.config);
          break;
        case 'webhook':
          await this.sendWebhook(payload, channel.config);
          break;
      }
    }
  }

  async sendBulk(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(payloads.map((p) => this.send(p)));
  }

  async schedule(payload: NotificationPayload, sendAt: Date): Promise<void> {
    // Store scheduled notification for worker processing
    await supabase.from('scheduled_notifications').insert({
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      metadata: payload.metadata,
      send_at: sendAt.toISOString(),
      status: 'pending',
    });
  }

  private async sendEmail(payload: NotificationPayload, config: Record<string, unknown>): Promise<void> {
    const { sendEmail } = await import('../../services/email');
    await sendEmail({
      to: config.email as string,
      subject: payload.title,
      body: payload.message,
    });
  }

  private async sendSlack(payload: NotificationPayload, config: Record<string, unknown>): Promise<void> {
    const { sendSlackMessage } = await import('../../services/slack');
    await sendSlackMessage({
      webhookUrl: config.webhookUrl as string,
      text: `*${payload.title}*\n${payload.message}`,
    });
  }

  private async sendWebhook(payload: NotificationPayload, config: Record<string, unknown>): Promise<void> {
    await fetch(config.url as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        workspaceId: payload.workspaceId,
        metadata: payload.metadata,
      }),
    });
  }
}
