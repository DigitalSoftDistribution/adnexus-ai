import type { IWebhookRepository, WebhookDelivery } from '../../../domain/repositories/IWebhookRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface ListWebhookDeliveriesInput {
  workspaceId: string;
  userRole: string;
  webhookId?: string;
}

export class ListWebhookDeliveriesUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: ListWebhookDeliveriesInput): Promise<Result<WebhookDelivery[]>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can view webhook deliveries'));
    }

    if (input.webhookId) {
      const config = await this.webhookRepo.findConfigByIdAndWorkspace(input.webhookId, input.workspaceId);
      if (!config) {
        return err(new NotFoundError('Webhook config'));
      }
      return ok(await this.webhookRepo.listDeliveries(input.webhookId));
    }

    return ok(await this.webhookRepo.listDeliveriesForWorkspace(input.workspaceId));
  }
}
