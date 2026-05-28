import { logger } from '../utils/logger';

export interface SlackMessageBlock {
  type: string;
  text?: string | { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{
    type: string;
    text?: string | { type: string; text: string; emoji?: boolean };
    url?: string;
    style?: string;
    emoji?: boolean;
  }>;
}

export interface SlackMessage {
  text: string;
  blocks?: SlackMessageBlock[];
  attachments?: Array<{
    color: string;
    fields?: Array<{ title: string; value: string; short: boolean }>;
    footer?: string;
    ts?: number;
  }>;
}

export interface MorningBriefSlackData {
  date: string;
  workspaceName: string;
  kpis: {
    spend: { value: number; change: number };
    roas: { value: number; change: number };
    conversions: { value: number; change: number };
    cpa: { value: number; change: number };
  };
  topWinners: Array<{ name: string; metric: string; change: number }>;
  recommendationsCount: number;
  dashboardUrl: string;
}

export interface DraftSlackData {
  draftId: string;
  campaignName: string;
  proposedBy: string;
  changes: Array<{ field: string; from: string; to: string }>;
  estimatedImpact: { additionalSpend: number; projectedRoas: number };
  approveUrl: string;
  rejectUrl: string;
}

export interface BudgetAlertData {
  alertId: string;
  type: 'budget_threshold' | 'budget_depleted' | 'overspend';
  severity: 'critical' | 'warning' | 'info';
  campaignName: string;
  campaignId: string;
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
  daysRemaining: number;
  projectedOverspend: number | null;
  url: string;
}

/**
 * Slack integration service for sending notifications to channels
 */
export class SlackService {
  private readonly appName: string;
  private readonly appIcon: string;

  constructor() {
    this.appName = 'AdNexus AI';
    this.appIcon = ':robot_face:';
  }

  /**
   * Send a raw notification to a Slack webhook URL
   */
  async sendNotification(webhookUrl: string, message: SlackMessage): Promise<void> {
    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.appName,
          icon_emoji: this.appIcon,
          ...message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} ${errorText}`);
      }

      logger.debug({ webhookUrl: this.maskUrl(webhookUrl) }, 'Slack notification sent');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: err.message, webhookUrl: this.maskUrl(webhookUrl) }, 'Failed to send Slack notification');
      throw err;
    }
  }

  /**
   * Send morning brief to Slack channel
   */
  async sendMorningBrief(webhookUrl: string, data: MorningBriefSlackData): Promise<void> {
    const message: SlackMessage = {
      text: `${this.appIcon} Good Morning! Your Daily Brief for ${data.date}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this.appName} — Daily Brief`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.date}*\n${data.workspaceName}`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📊 Key Metrics*',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Spend*\n$${data.kpis.spend.value.toLocaleString()} ${this.formatChange(data.kpis.spend.change)}`,
            },
            {
              type: 'mrkdwn',
              text: `*ROAS*\n${data.kpis.roas.value}x ${this.formatChange(data.kpis.roas.change)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Conversions*\n${data.kpis.conversions.value.toLocaleString()} ${this.formatChange(data.kpis.conversions.change)}`,
            },
            {
              type: 'mrkdwn',
              text: `*CPA*\n$${data.kpis.cpa.value} ${this.formatChange(-data.kpis.cpa.change)}`,
            },
          ],
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: data.topWinners.length > 0
              ? `*🏆 Top Winners*\n${data.topWinners.map((w) => `• *${w.name}*: +${w.change}% ${w.metric}`).join('\n')}`
              : '*🏆 Top Winners*\nNo significant winners today.',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🤖 AI Recommendations*\n${data.recommendationsCount} recommendation${data.recommendationsCount !== 1 ? 's' : ''} ready for review.`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Dashboard', emoji: true },
              url: data.dashboardUrl,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Recommendations', emoji: true },
              url: `${data.dashboardUrl}/recommendations`,
            },
          ],
        },
      ],
    };

    await this.sendNotification(webhookUrl, message);
  }

  /**
   * Send draft approval alert to Slack
   */
  async sendDraftAlert(webhookUrl: string, draft: DraftSlackData): Promise<void> {
    const changesText = draft.changes
      .map((c) => `• *${c.field}*: \`${c.from}\` → \`${c.to}\``)
      .join('\n');

    const message: SlackMessage = {
      text: `${this.appIcon} Draft Approval Required: ${draft.campaignName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Draft Approval Required',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${draft.campaignName}*\nProposed by: ${draft.proposedBy}`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📝 Proposed Changes*\n${changesText}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📊 Estimated Impact*\n• Additional Spend: $${draft.estimatedImpact.additionalSpend.toLocaleString()}\n• Projected ROAS: ${draft.estimatedImpact.projectedRoas}x`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✓ Approve', emoji: true },
              url: draft.approveUrl,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '✕ Request Changes', emoji: true },
              url: draft.rejectUrl,
              style: 'danger',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Details', emoji: true },
              url: `${draft.approveUrl}/details`,
            },
          ],
        },
      ],
    };

    await this.sendNotification(webhookUrl, message);
  }

  /**
   * Send budget alert to Slack
   */
  async sendBudgetAlert(webhookUrl: string, alert: BudgetAlertData): Promise<void> {
    const severityEmoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = alert.severity === 'critical' ? '#EF4444' : alert.severity === 'warning' ? '#F59E0B' : '#3B82F6';

    const message: SlackMessage = {
      text: `${severityEmoji} Budget Alert: ${alert.campaignName} — ${Math.round(alert.percentUsed)}% of budget used`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Campaign', value: `<${alert.url}|${alert.campaignName}>`, short: true },
            { title: 'Status', value: alert.severity.toUpperCase(), short: true },
            { title: 'Current Spend', value: `$${alert.currentSpend.toLocaleString()}`, short: true },
            { title: 'Budget Limit', value: `$${alert.budgetLimit.toLocaleString()}`, short: true },
            { title: 'Used', value: `${Math.round(alert.percentUsed)}%`, short: true },
            { title: 'Days Remaining', value: `${alert.daysRemaining}`, short: true },
            ...(alert.projectedOverspend
              ? [{ title: 'Projected Overspend', value: `-$${alert.projectedOverspend.toLocaleString()}`, short: false }]
              : []),
          ],
          footer: 'AdNexus AI',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await this.sendNotification(webhookUrl, message);
  }

  /**
   * Send generic performance alert
   */
  async sendPerformanceAlert(
    webhookUrl: string,
    data: {
      title: string;
      description: string;
      severity: 'critical' | 'warning' | 'info';
      campaignName?: string;
      campaignUrl?: string;
      metrics?: Array<{ label: string; value: string }>;
    },
  ): Promise<void> {
    const color = data.severity === 'critical' ? '#EF4444' : data.severity === 'warning' ? '#F59E0B' : '#3B82F6';

    const fields = data.metrics
      ? data.metrics.map((m) => ({ title: m.label, value: m.value, short: true }))
      : [];

    if (data.campaignName && data.campaignUrl) {
      fields.unshift({
        title: 'Campaign',
        value: `<${data.campaignUrl}|${data.campaignName}>`,
        short: false,
      });
    }

    const message: SlackMessage = {
      text: `${data.severity === 'critical' ? '🚨' : '⚠️'} ${data.title}`,
      attachments: [
        {
          color,
          fields: [
            ...fields,
            { title: 'Details', value: data.description, short: false },
          ],
          footer: 'AdNexus AI',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await this.sendNotification(webhookUrl, message);
  }

  /**
   * Send a simple text message to Slack
   */
  async sendSimpleMessage(webhookUrl: string, text: string): Promise<void> {
    await this.sendNotification(webhookUrl, { text: `${this.appIcon} ${text}` });
  }

  /**
   * Verify a Slack webhook URL is valid
   */
  async verifyWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Webhook verification test' }),
      });
      return response.ok || response.status === 400; // 400 is ok for empty test message
    } catch {
      return false;
    }
  }

  /**
   * Format a percentage change for Slack
   */
  private formatChange(change: number): string {
    if (change > 0) {
      return `(*+${change.toFixed(1)}%* 📈)`;
    } else if (change < 0) {
      return `(*${change.toFixed(1)}%* 📉)`;
    }
    return '(*0%* ➡️)';
  }

  /**
   * Mask webhook URL for safe logging
   */
  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.length > 8) {
          pathParts[pathParts.length - 1] = `${lastPart.slice(0, 4)}...${lastPart.slice(-4)}`;
        }
        parsed.pathname = pathParts.join('/');
      }
      return parsed.toString();
    } catch {
      return '***masked***';
    }
  }
}

export const slackService = new SlackService();
