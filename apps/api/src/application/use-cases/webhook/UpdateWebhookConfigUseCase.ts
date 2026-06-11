import type { IWebhookRepository } from '../../../domain/repositories/IWebhookRepository';
import type { WebhookConfig } from '../../../domain/entities/WebhookConfig';
import { Result, ok, err, ForbiddenError, NotFoundError, ValidationError } from '../../../domain/value-objects/Result';

export interface UpdateWebhookConfigInput {
  webhookId: string;
  workspaceId: string;
  userRole: string;
  name?: string;
  url?: string;
  events?: string[];
  secret?: string | null;
  status?: WebhookConfig['status'];
}

export class UpdateWebhookConfigUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: UpdateWebhookConfigInput): Promise<Result<WebhookConfig>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can manage webhooks'));
    }

    const existing = await this.webhookRepo.findConfigByIdAndWorkspace(input.webhookId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Webhook config'));
    }

    if (input.url !== undefined && !input.url.trim()) {
      return err(new ValidationError('URL cannot be empty'));
    }
    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('Name cannot be empty'));
    }

    const updates: Partial<WebhookConfig> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.url !== undefined) updates.url = input.url.trim();
    if (input.events !== undefined) updates.events = input.events;
    if (input.secret !== undefined) updates.secret = input.secret;
    if (input.status !== undefined) updates.status = input.status;

    const config = await this.webhookRepo.updateConfig(input.webhookId, updates);
    if (!config) {
      return err(new NotFoundError('Webhook config'));
    }

    return ok(config);
  }
}
