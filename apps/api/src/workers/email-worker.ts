import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

interface EmailJobResult {
  messageId: string;
  sentAt: string;
}

/**
 * Rate limiter for email sending - max 50 emails/minute per user
 */
class RateLimiter {
  private redis: Redis;
  private readonly maxPerMinute: number;
  private readonly windowSeconds: number;

  constructor(redis: Redis, maxPerMinute = 50) {
    this.redis = redis;
    this.maxPerMinute = maxPerMinute;
    this.windowSeconds = 60;
  }

  /**
   * Check if user can send email within rate limit
   */
  async canSend(userEmail: string): Promise<boolean> {
    const key = `email_rate_limit:${userEmail}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First email in this window, set expiry
      await this.redis.expire(key, this.windowSeconds);
    }

    return current <= this.maxPerMinute;
  }

  /**
   * Get remaining quota for user
   */
  async getRemainingQuota(userEmail: string): Promise<number> {
    const key = `email_rate_limit:${userEmail}`;
    const current = parseInt((await this.redis.get(key)) || '0', 10);
    return Math.max(0, this.maxPerMinute - current);
  }

  /**
   * Get time until window resets
   */
  async getResetTime(userEmail: string): Promise<number> {
    const key = `email_rate_limit:${userEmail}`;
    const ttl = await this.redis.ttl(key);
    return Math.max(0, ttl);
  }
}

/**
 * Email delivery service with retry logic and rate limiting
 */
class EmailDeliveryService {
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@adnexus.ai';
    this.fromName = process.env.EMAIL_FROM_NAME || 'AdNexus AI';
    this.rateLimiter = rateLimiter;

    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      });
      logger.info('Email worker using SendGrid transport');
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
      logger.info(`Email worker using SMTP transport: ${process.env.SMTP_HOST}`);
    } else {
      // Fallback: log emails in development
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      logger.warn('Email worker using JSON transport (development mode)');
    }
  }

  /**
   * Send email with rate limiting and delivery tracking
   */
  async send(data: EmailJobData, jobId: string): Promise<EmailJobResult> {
    const { to, subject, html, text } = data;

    // Check rate limit
    const canSend = await this.rateLimiter.canSend(to);
    if (!canSend) {
      const remaining = await this.rateLimiter.getRemainingQuota(to);
      const resetTime = await this.rateLimiter.getResetTime(to);
      throw new Error(
        `Rate limit exceeded for ${to}. ` +
        `Remaining: ${remaining}, resets in ${resetTime}s. ` +
        `Job ${jobId} will be retried.`
      );
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
        headers: {
          'X-AdNexus-Job-ID': jobId,
          'X-AdNexus-Environment': process.env.NODE_ENV || 'development',
        },
      });

      // Log successful delivery
      logger.info({
        messageId: result.messageId,
        to,
        subject,
        jobId,
      }, 'Email sent successfully');

      return {
        messageId: result.messageId || 'unknown',
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, to, subject, jobId }, 'Failed to send email');
      throw error;
    }
  }

  /**
   * Verify email transport connection
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create and configure the BullMQ email worker
 */
export function createEmailWorker(): Worker {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const rateLimiter = new RateLimiter(redis, 50); // 50 emails/minute per user
  const deliveryService = new EmailDeliveryService(rateLimiter);

  const worker = new Worker(
    'emails',
    async (job: Job<EmailJobData>): Promise<EmailJobResult> => {
      const startTime = Date.now();
      const { name, id, data } = job;

      logger.info({ jobId: id, jobName: name, to: data.to }, 'Processing email job');

      try {
        const result = await deliveryService.send(data, id || 'unknown');

        const duration = Date.now() - startTime;
        logger.info({
          jobId: id,
          jobName: name,
          to: data.to,
          messageId: result.messageId,
          durationMs: duration,
        }, 'Email job completed');

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error({
          jobId: id,
          jobName: name,
          to: data.to,
          error: err.message,
          attempt: job.attemptsMade + 1,
        }, 'Email job failed');
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 emails concurrently
      limiter: {
        max: 50,       // Max 50 jobs per
        duration: 60000, // 1 minute window
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result: EmailJobResult) => {
    logger.debug({
      jobId: job.id,
      jobName: job.name,
      messageId: result.messageId,
      sentAt: result.sentAt,
    }, 'Email job marked as completed');
  });

  worker.on('failed', (job, err) => {
    if (job) {
      const attemptsMade = job.attemptsMade;
      const maxAttempts = job.opts.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        logger.error({
          jobId: job.id,
          jobName: job.name,
          error: err.message,
          attemptsMade,
          maxAttempts,
        }, 'Email job exhausted all retry attempts - moving to dead letter');

        moveToDeadLetterQueue(redis, job.data, err).catch((dlqError) => {
          logger.error({ dlqError }, 'Failed to move job to dead letter queue');
        });
      } else {
        logger.warn({
          jobId: job.id,
          jobName: job.name,
          error: err.message,
          attemptsMade,
          maxAttempts,
          nextAttemptIn: 'exponential backoff',
        }, 'Email job failed, will retry');
      }
    }
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'Email worker encountered an error');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing email worker...');
    await worker.close();
    await redis.quit();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing email worker...');
    await worker.close();
    await redis.quit();
  });

  logger.info('Email worker started - listening on queue: emails');
  return worker;
}

/**
 * Move failed email job to dead letter queue for manual inspection.
 * Reuses the existing worker Redis connection instead of creating a new one.
 */
async function moveToDeadLetterQueue(
  redis: Redis,
  data: EmailJobData,
  error: Error,
): Promise<void> {
  const deadLetterEntry = {
    data,
    error: {
      message: error.message,
      stack: error.stack,
    },
    failedAt: new Date().toISOString(),
  };

  await redis.lpush(
    'emails:dead_letter',
    JSON.stringify(deadLetterEntry),
  );

  // Keep only last 1000 dead letter entries
  await redis.ltrim('emails:dead_letter', 0, 999);

  logger.info({ to: data.to, subject: data.subject }, 'Moved failed email to dead letter queue');
}

/**
 * Inspect the dead letter queue and return entries for manual review.
 */
export async function inspectDeadLetterQueue(
  redis: Redis,
  limit = 100
): Promise<Array<{ data: EmailJobData; error: unknown; failedAt: string }>> {
  const entries = await redis.lrange('emails:dead_letter', 0, limit - 1);
  return entries.map((e: string) => JSON.parse(e));
}

/**
 * Retry a specific dead letter entry by re-enqueuing it.
 */
export async function retryDeadLetter(
  redis: Redis,
  queue: Queue,
  dlqIndex: number
): Promise<void> {
  const entry = await redis.lindex('emails:dead_letter', dlqIndex);
  if (!entry) throw new Error(`No dead letter entry at index ${dlqIndex}`);

  const dlEntry = JSON.parse(entry);
  await queue.add('send-email', dlEntry.data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });

  // Remove from DLQ
  await redis.lrem('emails:dead_letter', 1, entry);
  logger.info({ to: dlEntry.data?.to, subject: dlEntry.data?.subject }, 'Retried email from dead letter queue');
}

/**
 * Health check for email worker
 */
export async function checkEmailWorkerHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, unknown>;
}> {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    // Check Redis connection
    await redis.ping();

    // Check queue depth
    const queue = await redis.llen('bull:emails:wait');
    const active = await redis.llen('bull:emails:active');
    const failed = await redis.llen('bull:emails:failed');
    const deadLetter = await redis.llen('emails:dead_letter');

    await redis.quit();

    const isHealthy = queue < 1000 && failed < 100;
    const isDegraded = queue < 5000 && failed < 500;

    return {
      status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
      details: {
        queueDepth: queue,
        activeJobs: active,
        failedJobs: failed,
        deadLetterQueue: deadLetter,
        redis: 'connected',
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      status: 'unhealthy',
      details: {
        error: err.message,
        redis: 'disconnected',
      },
    };
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  createEmailWorker();
  logger.info('Email worker process started');
}
