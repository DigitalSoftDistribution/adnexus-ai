import type { IWebhookRepository } from '../../../domain/repositories/IWebhookRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DeleteWebhookConfigInput {
  webhookId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteWebhookConfigUseCase {
  constructor(private webhookRepo: IWebhookRepository) {}

  async execute(input: DeleteWebhookConfigInput): Promise<Result<{ deleted: boolean }>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners and admins can manage webhooks'));
    }

    const existing = await this.webhookRepo.findConfigByIdAndWorkspace(input.webhookId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Webhook config'));
    }

    const deleted = await this.webhookRepo.deleteConfig(input.webhookId);
    return ok({ deleted });
  }
}
