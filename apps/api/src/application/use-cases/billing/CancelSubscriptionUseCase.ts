import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface CancelSubscriptionInput {
  workspaceId: string;
  userRole: string;
}

export class CancelSubscriptionUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: CancelSubscriptionInput): Promise<Result<void>> {
    if (!['owner'].includes(input.userRole)) {
      return err(new ForbiddenError('Only workspace owners can cancel subscriptions'));
    }

    await this.billingRepo.cancelSubscription(input.workspaceId);
    return ok(undefined);
  }
}
