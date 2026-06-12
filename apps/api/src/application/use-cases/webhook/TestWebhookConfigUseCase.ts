import type { IWebhookRepository, WebhookDelivery } from '../../../domain/repositories/IWebhookRepository';
import { deliverTestWebhook } from '../../../infrastructure/webhooks/deliverTestWebhook';
import { Result, ok, err, ForbiddenError, NotFoundError, ValidationError } from '../../../domain/value-objects/Result';

export interface TestWebhookConfigInput {
  webhookId: string;
  workspaceId: string;
  userRole: string;
  eventType?: string;
}

export interface TestWebhookConfigOutput {
  delivery: WebhookDelivery;
  statusCode: number;
  duration: number;
  message: string;
}

export class TestWebhookConfigUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: TestWebhookConfigInput): Promise<Result<TestWebhookConfigOutput>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can manage webhooks'));
    }

    const config = await this.webhookRepo.findConfigByIdAndWorkspace(input.webhookId, input.workspaceId);
    if (!config) {
      return err(new NotFoundError('Webhook config'));
    }

    if (config.status !== 'active') {
      return err(new ValidationError('Cannot test a paused webhook. Activate it first.'));
    }

    const eventType = input.eventType ?? config.events[0] ?? 'campaign.updated';
    const result = await deliverTestWebhook(config.url, eventType, config.secret);

    const delivery = await this.webhookRepo.recordDelivery({
      webhookConfigId: config.id,
      workspaceId: config.workspaceId,
      eventType,
      payload: result.payload,
      responseStatus: result.statusCode || null,
      responseBody: result.responseBody,
      deliveryStatus: result.status === 'success' ? 'delivered' : 'failed',
    });

    await this.webhookRepo.updateConfig(config.id, { lastTriggeredAt: new Date() });

    return ok({
      delivery,
      statusCode: result.statusCode,
      duration: result.duration,
      message: result.status === 'success'
        ? 'Test payload delivered successfully'
        : `Test delivery failed: ${result.responseBody || 'Unknown error'}`,
    });
  }
}
