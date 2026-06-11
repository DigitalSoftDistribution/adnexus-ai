import nodemailer, { Transporter } from 'nodemailer';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
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
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.warn({ err: error, userId }, 'Failed to look up user email');
      return null;
    }
    return data?.email ?? null;
  }

  private async getWorkspaceName(workspaceId: string): Promise<string> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .maybeSingle();

    if (error || !data?.name) {
      return 'Your Workspace';
    }
    return data.name as string;
  }

  /**
   * Fetch per-campaign daily metric rows for the workspace's campaigns
   * within [start, end] (inclusive, YYYY-MM-DD strings).
   */
  private async fetchDailyMetrics(
    workspaceId: string,
    start: string,
    end: string,
  ): Promise<Array<{ campaign_id: string; campaign_name: string; date: string; spend: number; roas: number; conversions: number; cpa: number; impressions: number; clicks: number }>> {
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, ad_accounts!inner(workspace_id)')
      .eq('ad_accounts.workspace_id', workspaceId);

    if (campaignsError || !campaigns || campaigns.length === 0) {
      if (campaignsError) {
        logger.warn({ err: campaignsError, workspaceId }, 'Failed to fetch campaigns for email metrics');
      }
      return [];
    }

    const nameById = new Map<string, string>(campaigns.map((c) => [c.id as string, (c.name as string) ?? 'Unnamed Campaign']));

    const { data: rows, error: metricsError } = await supabase
      .from('campaign_daily_metrics')
      .select('campaign_id, date, spend, roas, conversions, cpa, impressions, clicks')
      .in('campaign_id', campaigns.map((c) => c.id as string))
      .gte('date', start)
      .lte('date', end);

    if (metricsError) {
      logger.warn({ err: metricsError, workspaceId }, 'Failed to fetch daily metrics for email');
      return [];
    }

    return (rows ?? []).map((r) => ({
      campaign_id: r.campaign_id as string,
      campaign_name: nameById.get(r.campaign_id as string) ?? 'Unnamed Campaign',
      date: r.date as string,
      spend: Number(r.spend ?? 0),
      roas: Number(r.roas ?? 0),
      conversions: Number(r.conversions ?? 0),
      cpa: Number(r.cpa ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
    }));
  }

  private async getMorningBriefData(userId: string, workspaceId: string): Promise<MorningBriefData> {
    const now = new Date();
    const isoDay = (d: Date) => d.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000);
    const dayBefore = new Date(now.getTime() - 2 * 86400000);

    const [workspaceName, rows] = await Promise.all([
      this.getWorkspaceName(workspaceId),
      this.fetchDailyMetrics(workspaceId, isoDay(dayBefore), isoDay(yesterday)),
    ]);

    const yRows = rows.filter((r) => r.date === isoDay(yesterday));
    const pRows = rows.filter((r) => r.date === isoDay(dayBefore));

    const sum = (xs: typeof rows, key: 'spend' | 'conversions' | 'impressions' | 'clicks') =>
      xs.reduce((acc, r) => acc + r[key], 0);
    const pctChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    const ySpend = sum(yRows, 'spend');
    const pSpend = sum(pRows, 'spend');
    const yConv = sum(yRows, 'conversions');
    const pConv = sum(pRows, 'conversions');
    // Spend-weighted ROAS / CPA across campaigns
    const weightedRoas = (xs: typeof rows) => {
      const spend = sum(xs, 'spend');
      return spend > 0 ? xs.reduce((acc, r) => acc + r.roas * r.spend, 0) / spend : 0;
    };
    const cpa = (spend: number, conversions: number) => (conversions > 0 ? spend / conversions : 0);

    // Rank campaigns by day-over-day ROAS movement. Winners must have
    // improved and losers must have declined — on a day where everything
    // moved one way, the other list is simply empty.
    const prevByCampaign = new Map(pRows.map((r) => [r.campaign_id, r]));
    const movements = yRows
      .map((r) => {
        const prev = prevByCampaign.get(r.campaign_id);
        return {
          name: r.campaign_name,
          metric: 'ROAS',
          change: prev ? pctChange(r.roas, prev.roas) : 0,
        };
      })
      .filter((m) => m.change !== 0)
      .sort((a, b) => b.change - a.change);
    const winners = movements.filter((m) => m.change > 0);
    const losers = movements.filter((m) => m.change < 0);

    // Pending AI drafts double as actionable recommendations
    const { data: pendingDrafts } = await supabase
      .from('drafts')
      .select('id, campaign_name, change_summary, ai_reasoning, draft_type')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .eq('actor_type', 'ai')
      .order('created_at', { ascending: false })
      .limit(3);

    return {
      date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      workspaceName,
      kpis: {
        spend: { value: ySpend, change: pctChange(ySpend, pSpend) },
        roas: { value: weightedRoas(yRows), change: pctChange(weightedRoas(yRows), weightedRoas(pRows)) },
        conversions: { value: yConv, change: pctChange(yConv, pConv) },
        cpa: { value: cpa(ySpend, yConv), change: pctChange(cpa(ySpend, yConv), cpa(pSpend, pConv)) },
      },
      topWinners: winners.slice(0, 2),
      topLosers: losers.slice(-2).reverse(),
      recommendations: (pendingDrafts ?? []).map((d) => ({
        id: d.id as string,
        title: (d.change_summary as string) ?? `Proposed ${d.draft_type} for ${d.campaign_name}`,
        description: (d.ai_reasoning as string) ?? 'Review the pending draft for details.',
        impact: 'medium' as const,
        category: (d.draft_type as string) ?? 'Optimization',
      })),
      insights: [],
    };
  }

  private async getWeeklySummaryData(userId: string, workspaceId: string): Promise<WeeklySummaryData> {
    const now = new Date();
    const isoDay = (d: Date) => d.toISOString().slice(0, 10);
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

    const currentStart = isoDay(daysAgo(7));
    const currentEnd = isoDay(daysAgo(1));
    const previousStart = isoDay(daysAgo(14));
    const previousEnd = isoDay(daysAgo(8));

    const [workspaceName, rows] = await Promise.all([
      this.getWorkspaceName(workspaceId),
      this.fetchDailyMetrics(workspaceId, previousStart, currentEnd),
    ]);

    const current = rows.filter((r) => r.date >= currentStart);
    const previous = rows.filter((r) => r.date <= previousEnd);

    const sum = (xs: typeof rows, key: 'spend' | 'conversions' | 'impressions' | 'clicks') =>
      xs.reduce((acc, r) => acc + r[key], 0);
    const pctChange = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : 0);
    const weightedRoas = (xs: typeof rows) => {
      const spend = sum(xs, 'spend');
      return spend > 0 ? xs.reduce((acc, r) => acc + r.roas * r.spend, 0) / spend : 0;
    };
    const cpa = (spend: number, conversions: number) => (conversions > 0 ? spend / conversions : 0);

    const metric = (key: 'spend' | 'conversions' | 'impressions' | 'clicks') => {
      const c = sum(current, key);
      const p = sum(previous, key);
      return { current: c, previous: p, change: pctChange(c, p) };
    };

    // Top campaigns by spend over the current week
    const byCampaign = new Map<string, { name: string; spend: number; roasWeighted: number; conversions: number }>();
    for (const r of current) {
      const entry = byCampaign.get(r.campaign_id) ?? { name: r.campaign_name, spend: 0, roasWeighted: 0, conversions: 0 };
      entry.spend += r.spend;
      entry.roasWeighted += r.roas * r.spend;
      entry.conversions += r.conversions;
      byCampaign.set(r.campaign_id, entry);
    }
    const topCampaigns = [...byCampaign.values()]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3)
      .map((c) => ({
        name: c.name,
        spend: c.spend,
        roas: c.spend > 0 ? c.roasWeighted / c.spend : 0,
        conversions: c.conversions,
      }));

    const weekStartDate = daysAgo(7);
    const [{ count: aiActions }, { count: draftsCreated }] = await Promise.all([
      supabase
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('actor_type', 'ai')
        .gte('created_at', weekStartDate.toISOString()),
      supabase
        .from('drafts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', weekStartDate.toISOString()),
    ]);

    const spendM = metric('spend');
    const convM = metric('conversions');

    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      weekRange: `${fmt(daysAgo(7))} - ${fmt(daysAgo(1))}, ${now.getFullYear()}`,
      workspaceName,
      spend: spendM,
      roas: {
        current: weightedRoas(current),
        previous: weightedRoas(previous),
        change: pctChange(weightedRoas(current), weightedRoas(previous)),
      },
      conversions: convM,
      cpa: {
        current: cpa(spendM.current, convM.current),
        previous: cpa(spendM.previous, convM.previous),
        change: pctChange(cpa(spendM.current, convM.current), cpa(spendM.previous, convM.previous)),
      },
      impressions: metric('impressions'),
      clicks: metric('clicks'),
      topCampaigns,
      aiActions: aiActions ?? 0,
      draftsCreated: draftsCreated ?? 0,
      // Rough estimate: ~15 minutes of manual work saved per automated action
      timeSaved: `${(((aiActions ?? 0) * 15) / 60).toFixed(1)} hours`,
    };
  }

  /**
   * Send morning brief email.
   *
   * When the caller (e.g. the morning-brief worker) has already computed the
   * brief, pass it via `briefData` to avoid re-deriving it here.
   */
  async sendMorningBrief(userId: string, workspaceId: string, briefData?: MorningBriefData): Promise<void> {
    const email = await this.getUserEmail(userId);
    if (!email) {
      logger.warn(`No email found for user ${userId}, skipping morning brief`);
      return;
    }

    const data = briefData ?? (await this.getMorningBriefData(userId, workspaceId));
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
    const { data: row, error } = await supabase
      .from('drafts')
      .select('id, campaign_name, draft_type, change_summary, change_detail, ai_reasoning, impact_estimate, actor_type, actor_name')
      .eq('id', draftId)
      .maybeSingle();

    if (error || !row) {
      logger.warn({ err: error ?? undefined, draftId }, 'Draft not found, skipping approval email');
      return;
    }

    const fieldLabels: Record<string, string> = {
      budget_change: 'Daily Budget',
      status_change: 'Status',
      bid_adjustment: 'Bid Strategy',
      targeting_edit: 'Audience Targeting',
      audience_edit: 'Audience Targeting',
      creative_swap: 'Creative',
    };
    const detail = (row.change_detail ?? {}) as Record<string, unknown>;
    const reason = (row.ai_reasoning as string) ?? (row.change_summary as string) ?? '';

    const draft = {
      id: row.id as string,
      campaignName: (row.campaign_name as string) ?? 'Unknown Campaign',
      proposedBy:
        (row.actor_name as string) ?? (row.actor_type === 'ai' ? 'AdNexus AI' : 'A teammate'),
      changes: [
        {
          field: fieldLabels[row.draft_type as string] ?? (row.draft_type as string) ?? 'Change',
          from: String(detail.old_value ?? detail.old_status ?? '—'),
          to: String(detail.new_value ?? detail.new_status ?? '—'),
          reason,
        },
      ],
      impactSummary: (row.impact_estimate as string) ?? undefined,
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
