/**
 * AdNexus Onboarding Email Sequence Worker
 *
 * Manages a 7-email onboarding sequence triggered at key milestones.
 * Worker startup is gated by BACKGROUND_JOBS_ENABLED and
 * BACKGROUND_ONBOARDING_EMAILS_ENABLED (default-off, PR #79 pattern).
 */

import { Queue, Worker, Job } from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Redis } from 'ioredis';
import { getModuleLogger } from '../lib/logger';

const logger = getModuleLogger('onboarding-emails');

import { config } from '../config';
import { getRedisClient } from '../lib/redis';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.sendgrid.net';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'apikey';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@adnexus.io';
const FROM_NAME = process.env.FROM_NAME || 'AdNexus';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.adnexus.io';

export const ONBOARDING_EMAIL_QUEUE_NAME = 'onboarding-emails';

/** Delay constants (in milliseconds) */
export const ONBOARDING_EMAIL_DELAYS = {
  welcome: 0,
  day1: 24 * 60 * 60 * 1000,
  day3: 72 * 60 * 60 * 1000,
  day5: 5 * 24 * 60 * 60 * 1000,
  day7: 7 * 24 * 60 * 60 * 1000,
  day14: 14 * 24 * 60 * 60 * 1000,
  day30: 30 * 24 * 60 * 60 * 1000,
} as const;

export interface OnboardingEmailJob {
  userId: string;
  userName: string;
  email: string;
  template: OnboardingEmailTemplate;
  signedUpAt: string;
}

export interface OnboardingUserState {
  hasConnectedAccount: boolean;
  hasCreatedCampaign: boolean;
  hasUsedAiAgent: boolean;
  hasSetupWorkflow: boolean;
  hasEnabledMorningBrief: boolean;
  hasUpgraded: boolean;
  unsubscribedFromOnboarding: boolean;
}

export type OnboardingSkipReason = 'unsubscribed' | 'action_already_completed' | 'unknown_template';

export type OnboardingSendDecision =
  | { action: 'send' }
  | { action: 'skip'; reason: OnboardingSkipReason };

export type OnboardingWorkerStatus = 'disabled' | 'starting' | 'running' | 'stopped' | 'error';

export interface OnboardingWorkerSnapshot {
  status: OnboardingWorkerStatus;
  enabled: boolean;
  reason?: string;
  startedAt?: string;
}

interface TemplateData {
  subject: string;
  file: string;
  shouldSend: (state: OnboardingUserState) => boolean;
  urlKeys: Record<string, string>;
}

export const ONBOARDING_EMAIL_TEMPLATES = {
  welcome: {
    subject: "Welcome to AdNexus! Let's get you started",
    file: 'welcome.html',
    shouldSend: (_state: OnboardingUserState) => true,
    urlKeys: { dashboardUrl: '/dashboard' },
  },
  'day1-getting-started': {
    subject: 'Day 1: Connect your first ad account',
    file: 'day1-getting-started.html',
    shouldSend: (state: OnboardingUserState) => !state.hasConnectedAccount,
    urlKeys: { connectAccountUrl: '/settings/accounts' },
  },
  'day3-first-campaign': {
    subject: 'Day 3: Create your first campaign',
    file: 'day3-first-campaign.html',
    shouldSend: (state: OnboardingUserState) =>
      state.hasConnectedAccount && !state.hasCreatedCampaign,
    urlKeys: { createCampaignUrl: '/campaigns/new' },
  },
  'day5-ai-agent': {
    subject: 'Day 5: Meet your AI Agent',
    file: 'day5-ai-agent.html',
    shouldSend: (state: OnboardingUserState) =>
      state.hasCreatedCampaign && !state.hasUsedAiAgent,
    urlKeys: { aiAgentUrl: '/ai-agent' },
  },
  'day7-approval-workflow': {
    subject: 'Day 7: Set up your approval workflow',
    file: 'day7-approval-workflow.html',
    shouldSend: (state: OnboardingUserState) => !state.hasSetupWorkflow,
    urlKeys: { workflowUrl: '/settings/workflows' },
  },
  'day14-morning-brief': {
    subject: 'Your Morning Brief is ready',
    file: 'day14-morning-brief.html',
    shouldSend: (state: OnboardingUserState) =>
      state.hasCreatedCampaign && !state.hasEnabledMorningBrief,
    urlKeys: { morningBriefUrl: '/settings/notifications' },
  },
  'day30-upgrade': {
    subject: 'Ready to unlock the full power of AdNexus?',
    file: 'day30-upgrade.html',
    shouldSend: (state: OnboardingUserState) => !state.hasUpgraded,
    urlKeys: { upgradeUrl: '/settings/billing/upgrade' },
  },
} as const satisfies Record<string, TemplateData>;

export type OnboardingEmailTemplate = keyof typeof ONBOARDING_EMAIL_TEMPLATES;

export interface OnboardingSequenceJobDefinition {
  name: OnboardingEmailTemplate;
  delay: number;
  jobId: string;
}

let workerRedis: Redis | null = null;
let onboardingQueue: Queue<OnboardingEmailJob> | null = null;
let worker: Worker<OnboardingEmailJob> | null = null;
let transporter: Transporter | null = null;
let workerSnapshot: OnboardingWorkerSnapshot = {
  status: 'disabled',
  enabled: false,
};

export function getOnboardingEmailsDisableReason(): string | null {
  if (!config.backgroundJobs.enabled) {
    return 'BACKGROUND_JOBS_ENABLED is not true';
  }
  if (!config.backgroundJobs.onboardingEmailsEnabled) {
    return 'BACKGROUND_ONBOARDING_EMAILS_ENABLED is not true';
  }
  if (!config.redis.url) {
    return 'REDIS_URL is not configured';
  }

  const redis = getRedisClient();
  if (!redis || redis.status !== 'ready') {
    return `Redis is not ready: ${redis?.status ?? 'disconnected'}`;
  }

  return null;
}

export function getOnboardingEmailWorkerStatus(): OnboardingWorkerSnapshot {
  return { ...workerSnapshot };
}

export function renderOnboardingTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return rendered;
}

export function getOnboardingJobIds(userId: string): string[] {
  return [
    `welcome:${userId}`,
    `day1:${userId}`,
    `day3:${userId}`,
    `day5:${userId}`,
    `day7:${userId}`,
    `day14:${userId}`,
    `day30:${userId}`,
  ];
}

export function getOnboardingSequenceJobs(userId: string): OnboardingSequenceJobDefinition[] {
  return [
    { name: 'welcome', delay: ONBOARDING_EMAIL_DELAYS.welcome, jobId: `welcome:${userId}` },
    {
      name: 'day1-getting-started',
      delay: ONBOARDING_EMAIL_DELAYS.day1,
      jobId: `day1:${userId}`,
    },
    {
      name: 'day3-first-campaign',
      delay: ONBOARDING_EMAIL_DELAYS.day3,
      jobId: `day3:${userId}`,
    },
    { name: 'day5-ai-agent', delay: ONBOARDING_EMAIL_DELAYS.day5, jobId: `day5:${userId}` },
    {
      name: 'day7-approval-workflow',
      delay: ONBOARDING_EMAIL_DELAYS.day7,
      jobId: `day7:${userId}`,
    },
    {
      name: 'day14-morning-brief',
      delay: ONBOARDING_EMAIL_DELAYS.day14,
      jobId: `day14:${userId}`,
    },
    { name: 'day30-upgrade', delay: ONBOARDING_EMAIL_DELAYS.day30, jobId: `day30:${userId}` },
  ];
}

export function evaluateOnboardingSendDecision(
  template: string,
  state: OnboardingUserState,
): OnboardingSendDecision {
  if (state.unsubscribedFromOnboarding) {
    return { action: 'skip', reason: 'unsubscribed' };
  }

  const templateData = ONBOARDING_EMAIL_TEMPLATES[template as OnboardingEmailTemplate];
  if (!templateData) {
    return { action: 'skip', reason: 'unknown_template' };
  }

  if (!templateData.shouldSend(state)) {
    return { action: 'skip', reason: 'action_already_completed' };
  }

  return { action: 'send' };
}

function createEmailTransporter(): Transporter {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
  });
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createEmailTransporter();
  }
  return transporter;
}

const templateCache = new Map<string, string>();

function loadTemplate(templateFile: string): string {
  if (templateCache.has(templateFile)) {
    return templateCache.get(templateFile)!;
  }

  const templatePath = resolve(__dirname, '../templates/emails', templateFile);
  const content = readFileSync(templatePath, 'utf-8');
  templateCache.set(templateFile, content);
  return content;
}

async function fetchUserState(_userId: string): Promise<OnboardingUserState> {
  return {
    hasConnectedAccount: false,
    hasCreatedCampaign: false,
    hasUsedAiAgent: false,
    hasSetupWorkflow: false,
    hasEnabledMorningBrief: false,
    hasUpgraded: false,
    unsubscribedFromOnboarding: false,
  };
}

function getWorkerRedis(): Redis {
  if (!workerRedis) {
    workerRedis = new Redis(config.redis.url ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return workerRedis;
}

function getOnboardingQueue(): Queue<OnboardingEmailJob> {
  if (!onboardingQueue) {
    onboardingQueue = new Queue<OnboardingEmailJob>(ONBOARDING_EMAIL_QUEUE_NAME, {
      connection: getWorkerRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 7 * 24 * 60 * 60 },
        removeOnFail: { age: 14 * 24 * 60 * 60 },
      },
    });
  }
  return onboardingQueue;
}

async function processOnboardingJob(job: Job<OnboardingEmailJob>) {
  const { userId, userName, email, template } = job.data;

  const userState = await fetchUserState(userId);
  const decision = evaluateOnboardingSendDecision(template, userState);
  if (decision.action === 'skip') {
    return { skipped: true, reason: decision.reason };
  }

  const templateData = ONBOARDING_EMAIL_TEMPLATES[template];
  const html = loadTemplate(templateData.file);
  const urls: Record<string, string> = {
    supportUrl: `${APP_BASE_URL}/support`,
    unsubscribeUrl: `${APP_BASE_URL}/unsubscribe?type=onboarding&userId=${userId}&token={{unsubscribeToken}}`,
    userName,
    ...Object.fromEntries(
      Object.entries(templateData.urlKeys).map(([key, path]) => [key, `${APP_BASE_URL}${path}`]),
    ),
  };

  const renderedHtml = renderOnboardingTemplate(html, urls);
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: templateData.subject,
    html: renderedHtml,
    headers: {
      'X-AdNexus-Email-Type': template,
      'X-AdNexus-User-Id': userId,
    },
  });

  return { sent: true, template, recipient: email };
}

export async function startOnboardingEmailWorker(): Promise<OnboardingWorkerSnapshot> {
  const disableReason = getOnboardingEmailsDisableReason();
  if (disableReason) {
    workerSnapshot = {
      status: 'disabled',
      enabled: false,
      reason: disableReason,
    };
    return getOnboardingEmailWorkerStatus();
  }

  if (worker) {
    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: workerSnapshot.startedAt,
    };
    return getOnboardingEmailWorkerStatus();
  }

  workerSnapshot = { status: 'starting', enabled: true };

  try {
    const activeWorker = new Worker<OnboardingEmailJob>(
      ONBOARDING_EMAIL_QUEUE_NAME,
      processOnboardingJob,
      {
        connection: getWorkerRedis(),
        concurrency: 5,
        limiter: {
          max: 50,
          duration: 1000,
        },
      },
    );

    activeWorker.on('completed', (job, result) => {
      if (result?.skipped) {
        logger.info(`[Onboarding] Job ${job.id} skipped: ${result.reason}`);
      } else {
        logger.info(`[Onboarding] Job ${job.id} completed: sent ${result?.template}`);
      }
    });

    activeWorker.on('failed', (job, err) => {
      logger.error({ err: err.message }, `[Onboarding] Job ${job?.id} failed:`);
    });

    worker = activeWorker;
    workerSnapshot = {
      status: 'running',
      enabled: true,
      startedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workerSnapshot = {
      status: 'error',
      enabled: true,
      reason: message,
    };
  }

  return getOnboardingEmailWorkerStatus();
}

export async function stopOnboardingEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (onboardingQueue) {
    await onboardingQueue.close();
    onboardingQueue = null;
  }
  if (workerRedis) {
    await workerRedis.quit();
    workerRedis = null;
  }

  workerSnapshot = {
    status: 'stopped',
    enabled: false,
  };
}

export async function enqueueOnboardingSequence(params: {
  userId: string;
  userName: string;
  email: string;
  signedUpAt?: string;
}): Promise<void> {
  const disableReason = getOnboardingEmailsDisableReason();
  if (disableReason) {
    logger.info(`[Onboarding] Skipping enqueue: ${disableReason}`);
    return;
  }

  const { userId, userName, email, signedUpAt = new Date().toISOString() } = params;
  const queue = getOnboardingQueue();
  const jobs = getOnboardingSequenceJobs(userId);

  await Promise.all(
    jobs.map(({ name, delay, jobId }) =>
      queue.add(
        name,
        { userId, userName, email, template: name, signedUpAt },
        { delay, jobId },
      ),
    ),
  );

  logger.info({ userId, emailDomain: email.split('@')[1] ?? 'unknown' }, `Enqueued ${jobs.length} onboarding emails`);
}

export async function cancelOnboardingSequence(userId: string): Promise<void> {
  const disableReason = getOnboardingEmailsDisableReason();
  if (disableReason) {
    return;
  }

  const queue = getOnboardingQueue();
  await Promise.all(
    getOnboardingJobIds(userId).map(async (jobId) => {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    }),
  );

  logger.info(`Cancelled all pending emails for user ${userId}`);
}

export async function unsubscribeFromOnboarding(userId: string): Promise<void> {
  await cancelOnboardingSequence(userId);
  logger.info(`User ${userId} unsubscribed from onboarding emails`);
}

if (require.main === module) {
  void startOnboardingEmailWorker().then((status) => {
    if (status.status !== 'running') {
      logger.info(`[Onboarding] Worker not started: ${status.reason ?? status.status}`);
      process.exit(0);
    }
    logger.info('[Onboarding] Email worker started. Waiting for jobs...');
  });
}

export { worker, onboardingQueue };
