import crypto from 'crypto';

export interface WebhookTestDeliveryResult {
  status: 'success' | 'failed';
  statusCode: number;
  duration: number;
  responseBody: string;
  eventType: string;
  payload: Record<string, unknown>;
}

function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function buildTestPayload(eventType: string): Record<string, unknown> {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    deliveryId: crypto.randomUUID(),
    environment: 'test',
    data: { message: 'AdNexus webhook test delivery' },
  };
}

export async function deliverTestWebhook(
  url: string,
  eventType: string,
  secret: string | null,
): Promise<WebhookTestDeliveryResult> {
  const payload = buildTestPayload(eventType);
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'AdNexusAI-Webhook/1.0',
    'X-AdNexus-Event': eventType,
    'X-AdNexus-Delivery': crypto.randomUUID(),
    'X-AdNexus-Timestamp': new Date().toISOString(),
  };
  if (secret) {
    headers['X-AdNexus-Signature'] = `sha256=${signPayload(body, secret)}`;
  }

  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;
    const responseBody = (await response.text().catch(() => '')).slice(0, 2000);

    return {
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      duration,
      responseBody,
      eventType,
      payload,
    };
  } catch (err) {
    return {
      status: 'failed',
      statusCode: 0,
      duration: Date.now() - startTime,
      responseBody: err instanceof Error ? err.message : 'Network error',
      eventType,
      payload,
    };
  }
}
