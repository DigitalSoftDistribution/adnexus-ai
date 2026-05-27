import { createHmac, timingSafeEqual } from 'crypto';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
  webhookId: string;
  workspaceId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: WebhookPayload;
  url: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attemptCount: number;
  createdAt: Date;
  deliveredAt?: Date;
  nextRetryAt?: Date;
  signature: string;
  headers: Record<string, string>;
}

export interface WebhookConfig {
  id: string;
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  active: boolean;
  createdAt: Date;
}

export interface DeliveryAttempt {
  deliveryId: string;
  attemptNumber: number;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Webhook delivery service with HMAC signature verification,
 * retry logic, and delivery tracking.
 */
export class WebhookService {
  private redis: Redis;
  private readonly maxRetries: number;
  private readonly retryDelays: number[]; // milliseconds
  private readonly signatureHeader: string;
  private readonly requestTimeout: number;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.maxRetries = 3;
    this.retryDelays = [5000, 30000, 120000]; // 5s, 30s, 2min
    this.signatureHeader = 'X-AdNexus-Signature';
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Sign a payload with HMAC-SHA256
   */
  signPayload(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Verify a payload signature
   */
  verifySignature(payload: WebhookPayload, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const providedBuf = Buffer.from(signature, 'hex');

      if (expectedBuf.length !== providedBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, providedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Deliver a webhook payload with retries
   */
  async deliver(
    config: WebhookConfig,
    payload: WebhookPayload,
    deliveryId?: string,
  ): Promise<WebhookDelivery> {
    const id = deliveryId || this.generateDeliveryId();
    const signature = this.signPayload(payload, config.secret);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [this.signatureHeader]: `sha256=${signature}`,
      'X-AdNexus-Event': payload.event,
      'X-AdNexus-Delivery': id,
      'X-AdNexus-Timestamp': payload.timestamp.toString(),
      'User-Agent': 'AdNexusAI-Webhook/1.0',
      ...config.headers,
    };

    const delivery: WebhookDelivery = {
      id,
      webhookId: config.id,
      event: payload.event,
      payload,
      url: config.url,
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
      signature,
      headers,
    };

    // Store delivery record
    await this.saveDelivery(delivery);

    // Attempt delivery
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      delivery.attemptCount = attempt;

      const attemptRecord: DeliveryAttempt = {
        deliveryId: id,
        attemptNumber: attempt,
        startedAt: new Date(),
      };

      try {
        const result = await this.executeDelivery(config.url, payload, headers);

        attemptRecord.statusCode = result.statusCode;
        attemptRecord.responseBody = result.body;
        attemptRecord.completedAt = new Date();

        delivery.status = 'delivered';
        delivery.responseStatus = result.statusCode;
        delivery.responseBody = result.body;
        delivery.deliveredAt = new Date();

        await this.saveAttempt(attemptRecord);
        await this.saveDelivery(delivery);

        logger.info({
          deliveryId: id,
          webhookId: config.id,
          event: payload.event,
          statusCode: result.statusCode,
          attempts: attempt,
        }, 'Webhook delivered successfully');

        return delivery;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;

        attemptRecord.errorMessage = err.message;
        attemptRecord.completedAt = new Date();
        await this.saveAttempt(attemptRecord);

        delivery.status = attempt < this.maxRetries ? 'retrying' : 'failed';
        delivery.errorMessage = err.message;

        if (attempt < this.maxRetries) {
          const delay = this.retryDelays[attempt - 1] || this.retryDelays[this.retryDelays.length - 1];
          delivery.nextRetryAt = new Date(Date.now() + delay);
          await this.saveDelivery(delivery);

          logger.warn({
            deliveryId: id,
            webhookId: config.id,
            attempt,
            maxRetries: this.maxRetries,
            nextRetryIn: delay,
            error: err.message,
          }, 'Webhook delivery failed, will retry');

          await this.sleep(delay);
        } else {
          delivery.status = 'failed';
          await this.saveDelivery(delivery);

          logger.error({
            deliveryId: id,
            webhookId: config.id,
            event: payload.event,
            attempts: attempt,
            error: err.message,
          }, 'Webhook delivery exhausted all retries');
        }
      }
    }

    throw lastError || new Error(`Webhook delivery failed after ${this.maxRetries} attempts`);
  }

  /**
   * Execute a single delivery attempt
   */
  private async executeDelivery(
    url: string,
    payload: WebhookPayload,
    headers: Record<string, string>,
  ): Promise<{ statusCode: number; body: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.text();

      // Accept 2xx status codes as success
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
      }

      return { statusCode: response.status, body };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.requestTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Queue a webhook for async delivery
   */
  async queueDelivery(config: WebhookConfig, payload: WebhookPayload): Promise<string> {
    const deliveryId = this.generateDeliveryId();

    // Store in Redis queue for background processing
    await this.redis.lpush(
      'webhook:queue',
      JSON.stringify({
        config,
        payload,
        deliveryId,
        queuedAt: new Date().toISOString(),
      }),
    );

    logger.debug({
      deliveryId,
      webhookId: config.id,
      event: payload.event,
    }, 'Webhook queued for delivery');

    return deliveryId;
  }

  /**
   * Process queued webhook deliveries
   */
  async processQueue(): Promise<void> {
    const batchSize = 10;
    const items = await this.redis.lrange('webhook:queue', 0, batchSize - 1);

    if (items.length === 0) return;

    // Remove processed items
    await this.redis.ltrim('webhook:queue', items.length, -1);

    for (const item of items) {
      try {
        const { config, payload, deliveryId } = JSON.parse(item);
        await this.deliver(config, payload, deliveryId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error({ error: err.message }, 'Failed to process queued webhook');

        // Re-queue for later if it hasn't been re-queued too many times
        const requeueKey = `webhook:requeue_count:${JSON.parse(item).deliveryId}`;
        const requeueCount = parseInt((await this.redis.get(requeueKey)) || '0', 10);

        if (requeueCount < 5) {
          await this.redis.incr(requeueKey);
          await this.redis.expire(requeueKey, 86400);
          await this.redis.rpush('webhook:queue', item); // Push to end for retry later
        }
      }
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(deliveryId: string): Promise<WebhookDelivery | null> {
    const data = await this.redis.get(`webhook:delivery:${deliveryId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get delivery attempts for a delivery
   */
  async getDeliveryAttempts(deliveryId: string): Promise<DeliveryAttempt[]> {
    const data = await this.redis.lrange(`webhook:attempts:${deliveryId}`, 0, -1);
    return data.map((item) => JSON.parse(item));
  }

  /**
   * List deliveries for a webhook
   */
  async listDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
    const keys = await this.redis.keys(`webhook:delivery:*`);
    const deliveries: WebhookDelivery[] = [];

    for (const key of keys.slice(0, limit)) {
      const data = await this.redis.get(key);
      if (data) {
        const delivery: WebhookDelivery = JSON.parse(data);
        if (delivery.webhookId === webhookId) {
          deliveries.push(delivery);
        }
      }
    }

    return deliveries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Test a webhook endpoint
   */
  async testEndpoint(url: string, secret: string): Promise<{
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: Math.floor(Date.now() / 1000),
      data: { message: 'This is a test event from AdNexus AI' },
      webhookId: 'test',
      workspaceId: 'test',
    };

    const signature = this.signPayload(testPayload, secret);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          [this.signatureHeader]: `sha256=${signature}`,
          'X-AdNexus-Event': 'webhook.test',
          'User-Agent': 'AdNexusAI-Webhook/1.0',
        },
        body: JSON.stringify(testPayload),
      });

      const body = await response.text();
      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        statusCode: response.status,
        responseBody: body.slice(0, 1000),
        responseTime,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get webhook health status
   */
  async getWebhookHealth(webhookId: string): Promise<{
    totalDeliveries: number;
    successful: number;
    failed: number;
    successRate: number;
    averageResponseTime: number;
    lastDelivery?: Date;
  }> {
    const deliveries = await this.listDeliveries(webhookId, 100);

    const successful = deliveries.filter((d) => d.status === 'delivered').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;

    return {
      totalDeliveries: deliveries.length,
      successful,
      failed,
      successRate: deliveries.length > 0 ? (successful / deliveries.length) * 100 : 0,
      averageResponseTime: 0, // Would track in production
      lastDelivery: deliveries[0]?.deliveredAt || undefined,
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.redis.set(
      `webhook:delivery:${delivery.id}`,
      JSON.stringify(delivery),
      'EX',
      604800, // 7 days TTL
    );
  }

  private async saveAttempt(attempt: DeliveryAttempt): Promise<void> {
    await this.redis.lpush(
      `webhook:attempts:${attempt.deliveryId}`,
      JSON.stringify(attempt),
    );
    await this.redis.expire(`webhook:attempts:${attempt.deliveryId}`, 604800);
  }

  private generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.redis.quit();
  }
}

export const webhookService = new WebhookService();
