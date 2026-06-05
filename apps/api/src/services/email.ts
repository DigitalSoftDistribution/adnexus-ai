import nodemailer, { Transporter } from 'nodemailer';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import {
  morningBriefTemplate,
  draftApprovalTemplate,
  alertTemplate,
  weeklySummaryTemplate,
  welcomeTemplate,
  onboardingDay3Template,
  onboardingDay7Template,
  passwordResetTemplate,
  teamInviteTemplate,
} from './templates';

export interface AlertData {
  id: string;
  type: 'budget' | 'performance' | 'anomaly' | 'opportunity' | 'error';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  workspaceId?: string;
  campaignId?: string;
  campaignName?: string;
  createdAt: Date;
}

export interface MorningBriefData {
  date: string;
  workspaceName: string;
  kpis: {
    spend: { value: number; change: number };
    roas: { value: number; change: number };
    conversions: { value: number; change: number };
    cpa: { value: number; change: number };
  };
  topWinners: Array<{ name: string; metric: string; change: number }>;
  topLosers: Array<{ name: string; metric: string; change: number }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    category: string;
  }>;
  insights: string[];
}

export interface WeeklySummaryData {
  weekRange: string;
  workspaceName: string;
  spend: { current: number; previous: number; change: number };
  roas: { current: number; previous: number; change: number };
  conversions: { current: number; previous: number; change: number };
  cpa: { current: number; previous: number; change: number };
  impressions: { current: number; previous: number; change: number };
  clicks: { current: number; previous: number; change: number };
  topCampaigns: Array<{
    name: string;
    spend: number;
    roas: number;
    conversions: number;
  }>;
  aiActions: number;
  draftsCreated: number;
  timeSaved: string;
}

export interface EmailJobData {
  type: 'morning_brief' | 'draft_approval' | 'alert' | 'weekly_summary' | 'welcome' | 'onboarding_day3' | 'onboarding_day7' | 'password_reset' | 'team_invite';
  userId?: string;
  workspaceId?: string;
  draftId?: string;
  approverEmail?: string;
  alert?: AlertData;
  email?: string;
  token?: string;
  inviterName?: string;
  workspaceName?: string;
  data?: MorningBriefData | WeeklySummaryData;
}

export class EmailService {
  private transporter: Transporter;
  private emailQueue: Queue;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly appUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@adnexus.ai';
    this.fromName = process.env.EMAIL_FROM_NAME || 'AdNexus AI';
    this.appUrl = process.env.APP_URL || 'https://app.adnexus.ai';

    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    this.emailQueue = new Queue('emails', { connection: redis });

    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.warn('No email transport configured. Using JSON transport for development.');
    }
  }

  private async queueEmail(
    type: EmailJobData['type'],
    to: string,
    subject: string,
    html: string,
    text?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.emailQueue.add(
      type,
      {
        to,
        subject,
        html,
        text,
        metadata,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    );
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // TODO: Replace with actual user lookup from database
    logger.debug(`Looking up email for user: ${userId}`);
    return null;
  }

  private async getMorningBriefData(_userId: string, _workspaceId: string): Promise<MorningBriefData> {
    // TODO: Integrate with reporting service to gather actual data
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      workspaceName: 'Demo Workspace',
      kpis: {
        spend: { value: 12450.75, change: 12.3 },
        roas: { value: 4.85, change: -2.1 },
        conversions: { value: 342, change: 8.7 },
        cpa: { value: 36.4, change: -5.2 },
      },
      topWinners: [
        { name: 'Summer Sale Campaign', metric: 'ROAS', change: 45.2 },
        { name: 'Retargeting - Cart Abandoners', metric: 'Conversions', change: 32.8 },
      ],
      topLosers: [
        { name: 'Brand Awareness - Q3', metric: 'CPA', change: 28.5 },
        { name: 'Display - Prospecting', metric: 'ROAS', change: -18.3 },
      ],
      recommendations: [
        {
          id: 'rec_1',
          title: 'Increase budget on Summer Sale Campaign',
          description: 'ROAS is 45% above target. Increasing budget by 20% could yield 150+ additional conversions.',
          impact: 'high',
          category: 'Budget Optimization',
        },
        {
          id: 'rec_2',
          title: 'Pause underperforming ad sets in Brand Awareness',
          description: '3 ad sets have CPA 2x above average for 5+ days. Pausing could save $420/week.',
          impact: 'medium',
          category: 'Performance',
        },
        {
          id: 'rec_3',
          title: 'A/B test new creative for Retargeting campaign',
          description: 'Current creative frequency is high. Fresh creative could improve CTR by 15-25%.',
          impact: 'medium',
          category: 'Creative',
        },
      ],
      insights: [
        'Weekend ROAS was 23% higher than weekday average — consider increasing weekend budgets.',
        'Mobile conversions increased 18% after the latest landing page update.',
        'Competitor activity detected in 3 of your top-performing keywords.',
      ],
    };
  }

  private async getWeeklySummaryData(_userId: string, _workspaceId: string): Promise<WeeklySummaryData> {
    // TODO: Integrate with reporting service
    return {
      weekRange: 'Jan 6 - Jan 12, 2025',
      workspaceName: 'Demo Workspace',
      spend: { current: 87155.25, previous: 78920.0, change: 10.4 },
      roas: { current: 4.52, previous: 4.18, change: 8.1 },
      conversions: { current: 2394, previous: 2108, change: 13.6 },
      cpa: { current: 36.4, previous: 37.44, change: -2.8 },
      impressions: { current: 2840500, previous: 2610200, change: 8.8 },
      clicks: { current: 45200, previous: 41200, change: 9.7 },
      topCampaigns: [
        { name: 'Summer Sale Campaign', spend: 12450.75, roas: 6.2, conversions: 520 },
        { name: 'Retargeting - Cart Abandoners', spend: 8750.5, roas: 8.1, conversions: 680 },
        { name: 'Search - Brand', spend: 4200.0, roas: 12.4, conversions: 310 },
      ],
      aiActions: 24,
      draftsCreated: 8,
      timeSaved: '6.5 hours',
    };
  }

  /**
   * Send morning brief email
   */
  async sendMorningBrief(userId: string, workspaceId: string): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping morning brief`);
      return;
    }

    const data = await this.getMorningBriefData(userId, workspaceId);
    const html = morningBriefTemplate(data, this.appUrl);

    await this.queueEmail(
      'morning_brief',
      email,
      `Good Morning! Your Daily Brief for ${data.date}`,
      html,
      this.generateTextBrief(data),
      { userId, workspaceId },
    );

    logger.info(`Queued morning brief for user ${userId}`);
  }

  /**
   * Send draft approval request email
   */
  async sendDraftApprovalRequest(draftId: string, approverEmail: string): Promise<void> {
    // TODO: Fetch draft details from database
    const draft = {
      id: draftId,
      campaignName: 'Summer Sale Campaign',
      proposedBy: 'AdNexus AI',
      changes: [
        { field: 'Daily Budget', from: '$500', to: '$650', reason: 'ROAS is 45% above target' },
        { field: 'Bid Strategy', from: 'Lowest Cost', to: 'Cost Cap', reason: 'Improve cost efficiency' },
        { field: 'Audience Targeting', from: 'Broad', to: 'Lookalike 1%', reason: 'Higher conversion rate with similar audiences' },
      ],
      estimatedImpact: {
        additionalSpend: 1050,
        projectedRoas: 5.8,
        projectedConversions: 150,
      },
    };

    const html = draftApprovalTemplate(draft, this.appUrl);
    const approveUrl = `${this.appUrl}/drafts/${draftId}/approve`;
    const rejectUrl = `${this.appUrl}/drafts/${draftId}/reject`;

    await this.queueEmail(
      'draft_approval',
      approverEmail,
      `Approval Required: Changes to "${draft.campaignName}"`,
      html,
      `Draft approval request for ${draft.campaignName}.\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
      { draftId },
    );

    logger.info(`Queued draft approval email for draft ${draftId}`);
  }

  /**
   * Send alert notification email
   */
  async sendAlert(userId: string, alert: AlertData): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping alert`);
      return;
    }

    const html = alertTemplate(alert, this.appUrl);
    const subject = alert.severity === 'critical'
      ? `🚨 Critical Alert: ${alert.title}`
      : alert.severity === 'warning'
        ? `⚠️ Warning: ${alert.title}`
        : `ℹ️ ${alert.title}`;

    await this.queueEmail(
      'alert',
      email,
      subject,
      html,
      `Alert: ${alert.title}\n\n${alert.message}`,
      { userId, alertId: alert.id },
    );

    logger.info(`Queued alert email for user ${userId}, alert ${alert.id}`);
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(userId: string, workspaceId: string): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping weekly summary`);
      return;
    }

    const data = await this.getWeeklySummaryData(userId, workspaceId);
    const html = weeklySummaryTemplate(data, this.appUrl);

    await this.queueEmail(
      'weekly_summary',
      email,
      `Weekly Performance Summary — ${data.weekRange}`,
      html,
      this.generateTextWeeklySummary(data),
      { userId, workspaceId },
    );

    logger.info(`Queued weekly summary for user ${userId}`);
  }

  /**
   * Send welcome email (day 0 of onboarding)
   */
  async sendWelcomeEmail(userId: string): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping welcome email`);
      return;
    }

    const user = {
      name: 'there',
      email,
      workspaceName: 'Your Workspace',
    };

    const html = welcomeTemplate(user, this.appUrl);

    await this.queueEmail(
      'welcome',
      email,
      'Welcome to AdNexus AI — Let\'s Get Started!',
      html,
      `Welcome to AdNexus AI! We're excited to have you on board.\n\nGet started: ${this.appUrl}/onboarding`,
      { userId },
    );

    logger.info(`Queued welcome email for user ${userId}`);
  }

  /**
   * Send onboarding day 3 email
   */
  async sendOnboardingDay3(userId: string): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping day 3 onboarding`);
      return;
    }

    const html = onboardingDay3Template(this.appUrl);

    await this.queueEmail(
      'onboarding_day3',
      email,
      'Pro Tip: Set Up Your First Automation Rule',
      html,
      `Set up your first automation rule to save hours each week.\n\n${this.appUrl}/automation`,
      { userId },
    );

    logger.info(`Queued day 3 onboarding email for user ${userId}`);
  }

  /**
   * Send onboarding day 7 email
   */
  async sendOnboardingDay7(userId: string): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping day 7 onboarding`);
      return;
    }

    const html = onboardingDay7Template(this.appUrl);

    await this.queueEmail(
      'onboarding_day7',
      email,
      'You\'ve Saved 3 Hours This Week — Here\'s What\'s Next',
      html,
      `You've been using AdNexus AI for a week. Check out advanced features.\n\n${this.appUrl}/dashboard`,
      { userId },
    );

    logger.info(`Queued day 7 onboarding email for user ${userId}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const html = passwordResetTemplate(token, this.appUrl);
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    await this.queueEmail(
      'password_reset',
      email,
      'Reset Your AdNexus AI Password',
      html,
      `You requested a password reset. Click the link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
      { email },
    );

    logger.info(`Queued password reset email for ${email}`);
  }

  /**
   * Send team invite email
   */
  async sendTeamInvite(email: string, inviterName: string, workspaceName: string): Promise<void> {
    const html = teamInviteTemplate({ inviterName, workspaceName, email }, this.appUrl);
    const inviteUrl = `${this.appUrl}/accept-invite?email=${encodeURIComponent(email)}`;

    await this.queueEmail(
      'team_invite',
      email,
      `${inviterName} invited you to join ${workspaceName} on AdNexus AI`,
      html,
      `You've been invited to join ${workspaceName} on AdNexus AI by ${inviterName}.\n\nAccept invitation: ${inviteUrl}`,
      { email, workspaceName },
    );

    logger.info(`Queued team invite email for ${email} to workspace ${workspaceName}`);
  }

  /**
   * Send email immediately (bypass queue) - use sparingly
   */
  async sendImmediate(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });
      logger.info(`Sent immediate email to ${to}`);
    } catch (error) {
      logger.error({ error, to }, 'Failed to send immediate email');
      throw error;
    }
  }

  /**
   * Generate plain text version of morning brief
   */
  private generateTextBrief(data: MorningBriefData): string {
    const lines = [
      `Good Morning! Here's your daily brief for ${data.date}`,
      '',
      `Workspace: ${data.workspaceName}`,
      '',
      'KEY METRICS:',
      `Spend: $${data.kpis.spend.value.toLocaleString()} (${data.kpis.spend.change >= 0 ? '+' : ''}${data.kpis.spend.change}%)`,
      `ROAS: ${data.kpis.roas.value}x (${data.kpis.roas.change >= 0 ? '+' : ''}${data.kpis.roas.change}%)`,
      `Conversions: ${data.kpis.conversions.value.toLocaleString()} (${data.kpis.conversions.change >= 0 ? '+' : ''}${data.kpis.conversions.change}%)`,
      `CPA: $${data.kpis.cpa.value} (${data.kpis.cpa.change >= 0 ? '+' : ''}${data.kpis.cpa.change}%)`,
      '',
      'TOP WINNERS:',
      ...data.topWinners.map((w) => `  • ${w.name}: ${w.metric} +${w.change}%`),
      '',
      'TOP LOSERS:',
      ...data.topLosers.map((l) => `  • ${l.name}: ${l.metric} ${l.change}%`),
      '',
      'AI RECOMMENDATIONS:',
      ...data.recommendations.map((r) => `  • ${r.title} (${r.impact} impact)\n    ${r.description}`),
      '',
      'INSIGHTS:',
      ...data.insights.map((i) => `  • ${i}`),
      '',
      `View full dashboard: ${this.appUrl}/dashboard`,
    ];
    return lines.join('\n');
  }

  /**
   * Generate plain text version of weekly summary
   */
  private generateTextWeeklySummary(data: WeeklySummaryData): string {
    const lines = [
      `Weekly Performance Summary — ${data.weekRange}`,
      '',
      `Workspace: ${data.workspaceName}`,
      '',
      'WEEKLY METRICS:',
      `Spend: $${data.spend.current.toLocaleString()} (${data.spend.change >= 0 ? '+' : ''}${data.spend.change}%)`,
      `ROAS: ${data.roas.current}x (${data.roas.change >= 0 ? '+' : ''}${data.roas.change}%)`,
      `Conversions: ${data.conversions.current.toLocaleString()} (${data.conversions.change >= 0 ? '+' : ''}${data.conversions.change}%)`,
      `CPA: $${data.cpa.current} (${data.cpa.change >= 0 ? '+' : ''}${data.cpa.change}%)`,
      '',
      `AI Actions Taken: ${data.aiActions}`,
      `Drafts Created: ${data.draftsCreated}`,
      `Time Saved: ${data.timeSaved}`,
      '',
      `View full report: ${this.appUrl}/dashboard`,
    ];
    return lines.join('\n');
  }
}

export const emailService = new EmailService();

/** Standalone sendEmail helper for notifications */
export async function sendEmail(params: { to: string; subject: string; body: string }): Promise<void> {
  await emailService.sendImmediate(params.to, params.subject, params.body);
}
