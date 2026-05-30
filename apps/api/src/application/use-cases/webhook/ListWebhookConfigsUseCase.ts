import type { IWebhookRepository, WebhookConfig } from '../../../domain/repositories/IWebhookRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListWebhookConfigsInput {
  workspaceId: string;
  userRole: string;
}

export class ListWebhookConfigsUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: ListWebhookConfigsInput): Promise<Result<WebhookConfig[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const configs = await this.webhookRepo.listConfigs(input.workspaceId);
    return ok(configs);
  }
}
