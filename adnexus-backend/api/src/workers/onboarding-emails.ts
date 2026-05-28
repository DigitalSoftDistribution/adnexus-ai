// @ts-nocheck — unported worker, Transporter type mismatch
/**
 * AdNexus Onboarding Email Sequence Worker
 *
 * Manages a 7-email onboarding sequence triggered at key milestones:
 * - welcome          → immediate (on signup)
 * - day1-getting-started → 24h after signup
 * - day3-first-campaign  → 72h after signup
 * - day5-ai-agent        → 5 days after signup
 * - day7-approval-workflow → 7 days after signup
 * - day14-morning-brief  → 14 days after signup
 * - day30-upgrade        → 30 days after signup
 *
 * Features:
 * - BullMQ scheduled jobs with delay-based scheduling
 * - Conditional sends: checks user state before sending (skip if action already done)
 * - Unsubscribe awareness: skips emails for unsubscribed users
 * - Idempotent: safe to re-enqueue, duplicate sends prevented via jobId
 * - Graceful shutdown: handles SIGTERM/SIGINT for clean worker exit
 */

import { Queue, Worker, Job } from "bullmq";
import { createTransport, Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Redis } from "ioredis";

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.sendgrid.net";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "apikey";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@adnexus.io";
const FROM_NAME = process.env.FROM_NAME || "AdNexus";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://app.adnexus.io";

const QUEUE_NAME = "onboarding-emails";

/** Delay constants (in milliseconds) */
const DELAYS = {
  welcome: 0,                    // immediate
  day1: 24 * 60 * 60 * 1000,     // 24 hours
  day3: 72 * 60 * 60 * 1000,     // 72 hours
  day5: 5 * 24 * 60 * 60 * 1000, // 5 days
  day7: 7 * 24 * 60 * 60 * 1000, // 7 days
  day14: 14 * 24 * 60 * 60 * 1000, // 14 days
  day30: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface OnboardingEmailJob {
  /** Unique user identifier */
  userId: string;
  /** User's display name for personalization */
  userName: string;
  /** User's email address */
  email: string;
  /** Which email in the sequence to send */
  template: keyof typeof EMAIL_TEMPLATES;
  /** When the user signed up (ISO 8601) */
  signedUpAt: string;
}

interface UserState {
  hasConnectedAccount: boolean;
  hasCreatedCampaign: boolean;
  hasUsedAiAgent: boolean;
  hasSetupWorkflow: boolean;
  hasEnabledMorningBrief: boolean;
  hasUpgraded: boolean;
  unsubscribedFromOnboarding: boolean;
}

interface TemplateData {
  subject: string;
  file: string;
  shouldSend: (state: UserState) => boolean;
  urlKeys: Record<string, string>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Email Template Registry
// ──────────────────────────────────────────────────────────────────────────────

/** Maps each email step to its template, send condition, and CTA URL paths */
const EMAIL_TEMPLATES: Record<string, TemplateData> = {
  welcome: {
    subject: "Welcome to AdNexus! Let's get you started",
    file: "welcome.html",
    shouldSend: (_state: UserState) => true, // always send welcome
    urlKeys: { dashboardUrl: "/dashboard" },
  },
  "day1-getting-started": {
    subject: "Day 1: Connect your first ad account",
    file: "day1-getting-started.html",
    shouldSend: (state: UserState) => !state.hasConnectedAccount,
    urlKeys: { connectAccountUrl: "/settings/accounts" },
  },
  "day3-first-campaign": {
    subject: "Day 3: Create your first campaign",
    file: "day3-first-campaign.html",
    shouldSend: (state: UserState) =>
      state.hasConnectedAccount && !state.hasCreatedCampaign,
    urlKeys: { createCampaignUrl: "/campaigns/new" },
  },
  "day5-ai-agent": {
    subject: "Day 5: Meet your AI Agent",
    file: "day5-ai-agent.html",
    shouldSend: (state: UserState) =>
      state.hasCreatedCampaign && !state.hasUsedAiAgent,
    urlKeys: { aiAgentUrl: "/ai-agent" },
  },
  "day7-approval-workflow": {
    subject: "Day 7: Set up your approval workflow",
    file: "day7-approval-workflow.html",
    shouldSend: (state: UserState) => !state.hasSetupWorkflow,
    urlKeys: { workflowUrl: "/settings/workflows" },
  },
  "day14-morning-brief": {
    subject: "Your Morning Brief is ready",
    file: "day14-morning-brief.html",
    shouldSend: (state: UserState) =>
      state.hasCreatedCampaign && !state.hasEnabledMorningBrief,
    urlKeys: { morningBriefUrl: "/settings/notifications" },
  },
  "day30-upgrade": {
    subject: "Ready to unlock the full power of AdNexus?",
    file: "day30-upgrade.html",
    shouldSend: (state: UserState) => !state.hasUpgraded,
    urlKeys: { upgradeUrl: "/settings/billing/upgrade" },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Redis Connection
// ──────────────────────────────────────────────────────────────────────────────

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false,
});

// ──────────────────────────────────────────────────────────────────────────────
// Email Transport
// ──────────────────────────────────────────────────────────────────────────────

function createEmailTransporter() {
  return createTransport({
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

let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
  if (!transporter) {
    transporter = createEmailTransporter();
  }
  return transporter;
}

// ──────────────────────────────────────────────────────────────────────────────
// Template Loading & Rendering
// ──────────────────────────────────────────────────────────────────────────────

const templateCache = new Map<string, string>();

function loadTemplate(templateFile: string): string {
  if (templateCache.has(templateFile)) {
    return templateCache.get(templateFile)!;
  }

  const templatePath = resolve(
    __dirname,
    "../templates/emails",
    templateFile
  );
  const content = readFileSync(templatePath, "utf-8");
  templateCache.set(templateFile, content);
  return content;
}

function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value
    );
  }
  return rendered;
}

// ──────────────────────────────────────────────────────────────────────────────
// User State (stub — replace with real DB calls)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the onboarding-relevant state for a user.
 *
 * INTEGRATION: Replace this stub with your actual database queries.
 * Example queries you might run:
 *   - SELECT EXISTS(SELECT 1 FROM ad_accounts WHERE user_id = $1)
 *   - SELECT EXISTS(SELECT 1 FROM campaigns WHERE user_id = $1)
 *   - SELECT has_used_ai_agent, has_setup_workflow, ... FROM users WHERE id = $1
 *   - SELECT unsubscribed FROM email_preferences WHERE user_id = $1 AND type = 'onboarding'
 */
async function fetchUserState(userId: string): Promise<UserState> {
  // Placeholder: return default state. In production, query your database.
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

// ──────────────────────────────────────────────────────────────────────────────
// Queue
// ──────────────────────────────────────────────────────────────────────────────

export const onboardingQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { age: 7 * 24 * 60 * 60 }, // keep 7 days
    removeOnFail: { age: 14 * 24 * 60 * 60 },    // keep 14 days
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Public API: Enqueue the Full Onboarding Sequence
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Enqueue the complete onboarding email sequence for a newly-signed-up user.
 * Uses deterministic jobIds to ensure idempotency — safe to call multiple times.
 */
export async function enqueueOnboardingSequence(params: {
  userId: string;
  userName: string;
  email: string;
  signedUpAt?: string;
}): Promise<void> {
  const { userId, userName, email, signedUpAt = new Date().toISOString() } = params;

  const jobs: Array<{ name: string; delay: number; jobId: string }> = [
    { name: "welcome", delay: DELAYS.welcome, jobId: `welcome:${userId}` },
    {
      name: "day1-getting-started",
      delay: DELAYS.day1,
      jobId: `day1:${userId}`,
    },
    {
      name: "day3-first-campaign",
      delay: DELAYS.day3,
      jobId: `day3:${userId}`,
    },
    { name: "day5-ai-agent", delay: DELAYS.day5, jobId: `day5:${userId}` },
    {
      name: "day7-approval-workflow",
      delay: DELAYS.day7,
      jobId: `day7:${userId}`,
    },
    {
      name: "day14-morning-brief",
      delay: DELAYS.day14,
      jobId: `day14:${userId}`,
    },
    {
      name: "day30-upgrade",
      delay: DELAYS.day30,
      jobId: `day30:${userId}`,
    },
  ];

  const addPromises = jobs.map(({ name, delay, jobId }) =>
    onboardingQueue.add(
      name,
      { userId, userName, email, template: name, signedUpAt } as OnboardingEmailJob,
      { delay, jobId }
    )
  );

  await Promise.all(addPromises);

  console.log(`[Onboarding] Enqueued ${jobs.length} emails for user ${userId} (${email})`);
}

/**
 * Cancel all pending onboarding emails for a user.
 * Call this when a user unsubscribes or deletes their account.
 */
export async function cancelOnboardingSequence(userId: string): Promise<void> {
  const jobIds = [
    `welcome:${userId}`,
    `day1:${userId}`,
    `day3:${userId}`,
    `day5:${userId}`,
    `day7:${userId}`,
    `day14:${userId}`,
    `day30:${userId}`,
  ];

  const removals = jobIds.map(async (jobId) => {
    const job = await onboardingQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  });

  await Promise.all(removals);

  console.log(`[Onboarding] Cancelled all pending emails for user ${userId}`);
}

/**
 * Record an unsubscribe event for a user. Cancels all pending emails.
 */
export async function unsubscribeFromOnboarding(userId: string): Promise<void> {
  // INTEGRATION: Persist unsubscribe to your database
  // await db.update(users).set({ unsubscribedFromOnboarding: true }).where(eq(users.id, userId));

  await cancelOnboardingSequence(userId);

  console.log(`[Onboarding] User ${userId} unsubscribed from onboarding emails`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Worker: Processes Jobs from the Queue
// ──────────────────────────────────────────────────────────────────────────────

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job<OnboardingEmailJob>) => {
    const { userId, userName, email, template } = job.data;

    console.log(`[Onboarding] Processing ${job.name} for ${email} (attempt ${job.attemptsMade + 1})`);

    // 1. Check if user is unsubscribed
    const userState = await fetchUserState(userId);
    if (userState.unsubscribedFromOnboarding) {
      console.log(`[Onboarding] Skipping ${template} — user ${userId} unsubscribed`);
      return { skipped: true, reason: "unsubscribed" };
    }

    // 2. Check if action already completed (conditional send)
    const templateData = EMAIL_TEMPLATES[template];
    if (!templateData) {
      throw new Error(`Unknown template: ${template}`);
    }

    if (!templateData.shouldSend(userState)) {
      console.log(`[Onboarding] Skipping ${template} — action already completed or prerequisite not met`);
      return { skipped: true, reason: "action_already_completed" };
    }

    // 3. Load and render template
    const html = loadTemplate(templateData.file);

    // Build URL replacements
    const urls: Record<string, string> = {
      supportUrl: `${APP_BASE_URL}/support`,
      unsubscribeUrl: `${APP_BASE_URL}/unsubscribe?type=onboarding&userId=${userId}&token={{unsubscribeToken}}`,
      userName,
      ...Object.fromEntries(
        Object.entries(templateData.urlKeys).map(([key, path]) => [
          key,
          `${APP_BASE_URL}${path}`,
        ])
      ),
    };

    const renderedHtml = renderTemplate(html, urls);

    // 4. Send email
    const mailer = getTransporter();
    await mailer.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: templateData.subject,
      html: renderedHtml,
      headers: {
        "X-AdNexus-Email-Type": template,
        "X-AdNexus-User-Id": userId,
      },
    });

    console.log(`[Onboarding] Sent ${template} to ${email}`);

    return { sent: true, template, recipient: email };
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 1000, // 50 emails/sec max
    },
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ──────────────────────────────────────────────────────────────────────────────

worker.on("completed", (job, result) => {
  if (result?.skipped) {
    console.log(`[Onboarding] Job ${job.id} skipped: ${result.reason}`);
  } else {
    console.log(`[Onboarding] Job ${job.id} completed: sent ${result?.template}`);
  }
});

worker.on("failed", (job, err) => {
  console.error(`[Onboarding] Job ${job?.id} failed:`, err.message);
});

// ──────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown
// ──────────────────────────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`[Onboarding] Received ${signal}, shutting down gracefully...`);
  await worker.close();
  await onboardingQueue.close();
  await redisConnection.quit();
  console.log("[Onboarding] Worker and queue closed. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ──────────────────────────────────────────────────────────────────────────────
// Standalone Execution
// ──────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  console.log("[Onboarding] Email worker started. Waiting for jobs...");
}

// Export the worker for testability
export { worker };
