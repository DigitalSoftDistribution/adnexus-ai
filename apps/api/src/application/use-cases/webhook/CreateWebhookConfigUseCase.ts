import type { IWebhookRepository } from '../../../domain/repositories/IWebhookRepository';
import type { WebhookConfig } from '../../../domain/entities/WebhookConfig';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface CreateWebhookConfigInput {
  workspaceId: string;
  userRole: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
}

export class CreateWebhookConfigUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: CreateWebhookConfigInput): Promise<Result<WebhookConfig>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can manage webhooks'));
    }

    if (!input.name?.trim() || !input.url?.trim()) {
      return err(new ValidationError('Name and URL are required'));
    }

    const config = await this.webhookRepo.createConfig({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      url: input.url.trim(),
      events: input.events,
      secret: input.secret ?? null,
      status: 'active',
      lastTriggeredAt: null,
      failureCount: 0,
      createdBy: null,
    });

    return ok(config);
  }
}
