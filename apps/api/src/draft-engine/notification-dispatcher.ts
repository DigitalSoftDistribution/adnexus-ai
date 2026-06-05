/**
 * NotificationDispatcher – Notifies relevant users on execution
 * success, failure, rollback, or critical escalation.
 */

import type { Notification, Draft, ExecutionResult } from './types';
import {
  NotificationChannel,
  NotificationSeverity,
} from './types';
import { NotificationDispatchError } from './errors';
import crypto from 'crypto';

// ────────────────────────────────────────────────
// Channel sender interfaces
// ────────────────────────────────────────────────

export interface EmailSender {
  send(to: string[], subject: string, body: string): Promise<void>;
}

export interface SlackSender {
  postMessage(channel: string, message: string, blocks?: unknown[]): Promise<void>;
  send?(webhookUrl: string, message: Record<string, unknown>): Promise<void>;
}

export interface InAppSender {
  notify(userId: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
  send?(userId: string, notification: Record<string, unknown>): Promise<void>;
}

export interface WebhookSender {
  post(url: string, payload: Record<string, unknown>): Promise<void>;
  send?(url: string, payload: Record<string, unknown>): Promise<void>;
}

// ────────────────────────────────────────────────
// Channel registry
// ────────────────────────────────────────────────

export interface ChannelRegistry {
  email?: EmailSender;
  slack?: SlackSender;
  inApp?: InAppSender;
  webhook?: WebhookSender;
}

// ────────────────────────────────────────────────
// NotificationDispatcher
// ────────────────────────────────────────────────

export class NotificationDispatcher {
  constructor(
    private readonly channels: ChannelRegistry,
    private readonly defaultChannels: NotificationChannel[] = [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
    ]
  ) {}

  /**
   * Notify on successful execution.
   */
  async notifyExecutionSuccess(draft: Draft, result: ExecutionResult): Promise<void> {
    const notification = this.buildNotification({
      draft,
      type: 'execution_success',
      severity: NotificationSeverity.INFO,
      title: `✅ Draft Applied: ${draft.campaign.name}`,
      message: `Draft ${draft.id} was successfully applied to ${draft.platform} campaign "${draft.campaign.name}". ` +
        `Change: ${draft.changeType} (${result.durationMs}ms)`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        durationMs: result.durationMs,
        appliedFields: result.appliedChanges?.map((c) => c.field),
      },
    });

    await this.dispatch(notification);
  }

  /**
   * Notify on execution failure.
   */
  async notifyExecutionFailure(draft: Draft, result: ExecutionResult): Promise<void> {
    const rollbackInfo = result.rollbackResult
      ? result.rollbackResult.success
        ? ' (rolled back successfully)'
        : ' (ROLLBACK ALSO FAILED — CRITICAL)'
      : '';

    const notification = this.buildNotification({
      draft,
      type: 'execution_failure',
      severity: result.rollbackResult?.success ? NotificationSeverity.WARNING : NotificationSeverity.ERROR,
      title: `❌ Draft Failed: ${draft.campaign.name}`,
      message: `Draft ${draft.id} failed to apply to ${draft.platform} campaign "${draft.campaign.name}".\n` +
        `Error: ${result.error?.message ?? 'Unknown error'}${rollbackInfo}`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        rollbackSuccess: result.rollbackResult?.success ?? false,
        durationMs: result.durationMs,
      },
    });

    await this.dispatch(notification);
  }

  /**
   * Notify when a rollback is triggered.
   */
  async notifyRollbackTriggered(draft: Draft, reason: string): Promise<void> {
    const notification = this.buildNotification({
      draft,
      type: 'rollback_triggered',
      severity: NotificationSeverity.WARNING,
      title: `🔄 Rollback Triggered: ${draft.campaign.name}`,
      message: `A rollback was triggered for draft ${draft.id} on ${draft.platform} campaign "${draft.campaign.name}".\nReason: ${reason}`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        rollbackReason: reason,
      },
    });

    await this.dispatch(notification);
  }

  /**
   * Notify when rollback fails — CRITICAL escalation.
   */
  async notifyRollbackFailure(draft: Draft, error: Error): Promise<void> {
    const notification = this.buildNotification({
      draft,
      type: 'rollback_failed',
      severity: NotificationSeverity.CRITICAL,
      title: `🚨 ROLLBACK FAILED: ${draft.campaign.name}`,
      message: `CRITICAL: Rollback failed for draft ${draft.id} on ${draft.platform} campaign "${draft.campaign.name}". ` +
        `Manual intervention required immediately!\n\nError: ${error.message}`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        errorCode: error.name,
        errorMessage: error.message,
      },
    });

    // Always dispatch to ALL channels for critical failures
    const criticalNotification = {
      ...notification,
      channels: Object.values(NotificationChannel) as NotificationChannel[],
    };

    await this.dispatch(criticalNotification);
  }

  /**
   * Notify on high-risk change being applied.
   */
  async notifyRiskAlert(draft: Draft, riskScore: number): Promise<void> {
    const notification = this.buildNotification({
      draft,
      type: 'risk_alert',
      severity: NotificationSeverity.WARNING,
      title: `⚠️ High Risk Change: ${draft.campaign.name}`,
      message: `Draft ${draft.id} for ${draft.platform} campaign "${draft.campaign.name}" has a risk score of ${riskScore}/100. ` +
        `Change type: ${draft.changeType}. Please review.`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        riskScore,
      },
    });

    await this.dispatch(notification);
  }

  /**
   * Notify validation failure — no execution attempted.
   */
  async notifyValidationFailure(
    draft: Draft,
    errors: Array<{ code: string; message: string }>
  ): Promise<void> {
    const errorList = errors.map((e) => `  • ${e.code}: ${e.message}`).join('\n');
    const notification = this.buildNotification({
      draft,
      type: 'execution_failure',
      severity: NotificationSeverity.WARNING,
      title: `⚠️ Draft Validation Failed: ${draft.campaign.name}`,
      message: `Draft ${draft.id} failed validation and was not executed.\n\nErrors:\n${errorList}`,
      metadata: {
        draftId: draft.id,
        campaignName: draft.campaign.name,
        platform: draft.platform,
        changeType: draft.changeType,
        validationErrors: errors,
      },
    });

    await this.dispatch(notification);
  }

  // ───────────── dispatch internals ─────────────

  private buildNotification(params: {
    draft: Draft;
    type: Notification['type'];
    severity: NotificationSeverity;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  }): Notification {
    const recipients = this.resolveRecipients(params.draft);
    const channels = this.resolveChannels(params.draft, params.type);

    return {
      id: `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      draftId: params.draft.id,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      recipients,
      channels,
      metadata: params.metadata as Notification['metadata'],
      sentAt: new Date(),
    };
  }

  private async dispatch(notification: Notification): Promise<void> {
    const failures: string[] = [];

    for (const channel of notification.channels) {
      try {
        await this.sendToChannel(channel, notification);
      } catch (_error) {
        failures.push(channel);
      }
    }

    if (failures.length > 0) {
      throw new NotificationDispatchError({
        draftId: notification.draftId,
        channels: failures,
      });
    }
  }

  private async sendToChannel(channel: NotificationChannel, notification: Notification): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(notification);
        break;
      case NotificationChannel.SLACK:
        await this.sendSlack(notification);
        break;
      case NotificationChannel.IN_APP:
        await this.sendInApp(notification);
        break;
      case NotificationChannel.WEBHOOK:
        await this.sendWebhook(notification);
        break;
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    if (!this.channels.email) return;

    const subject = `[AdNexus] ${notification.title}`;
    const body = `
${notification.message}

---
Draft ID: ${notification.metadata.draftId}
Campaign: ${notification.metadata.campaignName}
Platform: ${notification.metadata.platform}
Change Type: ${notification.metadata.changeType}
Severity: ${notification.severity}
Time: ${notification.sentAt.toISOString()}
    `.trim();

    await this.channels.email.send(notification.recipients, subject, body);
  }

  private async sendSlack(notification: Notification): Promise<void> {
    if (!this.channels.slack) return;

    const _color =
      notification.severity === NotificationSeverity.CRITICAL
        ? '#FF0000'
        : notification.severity === NotificationSeverity.ERROR
        ? '#FF4444'
        : notification.severity === NotificationSeverity.WARNING
        ? '#FFAA00'
        : '#36A64F';

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: notification.title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: notification.message },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Draft:* ${notification.metadata.draftId}` },
          { type: 'mrkdwn', text: `*Campaign:* ${notification.metadata.campaignName}` },
          { type: 'mrkdwn', text: `*Platform:* ${notification.metadata.platform}` },
        ],
      },
    ];

    await this.channels.slack.postMessage('#adnexus-alerts', notification.title, blocks);
  }

  private async sendInApp(notification: Notification): Promise<void> {
    if (!this.channels.inApp) return;

    for (const recipient of notification.recipients) {
      await this.channels.inApp.notify(
        recipient,
        notification.title,
        notification.message,
        notification.metadata
      );
    }
  }

  private async sendWebhook(notification: Notification): Promise<void> {
    if (!this.channels.webhook) return;

    await this.channels.webhook.post('https://hooks.adnexus.io/notifications', {
      event: notification.type,
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      timestamp: notification.sentAt.toISOString(),
    });
  }

  private resolveRecipients(draft: Draft): string[] {
    const recipients = new Set<string>();
    recipients.add(draft.requestedBy.email);
    if (draft.approvedBy) {
      recipients.add(draft.approvedBy.email);
    }
    return Array.from(recipients);
  }

  private resolveChannels(draft: Draft, eventType: Notification['type']): NotificationChannel[] {
    const channels = new Set<NotificationChannel>();

    // Add default channels
    for (const ch of this.defaultChannels) {
      channels.add(ch);
    }

    // Check user preferences for both requester and approver
    for (const user of [draft.requestedBy, draft.approvedBy]) {
      if (!user) continue;
      for (const pref of user.notificationPreferences) {
        if (pref.enabled && pref.events.includes(eventType as any)) {
          channels.add(pref.channel);
        }
      }
    }

    return Array.from(channels);
  }
}
