import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import { Result, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

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

    return err(
      new ValidationError(
        'Self-service cancellation must be completed through the Stripe billing portal so subscription state stays in sync.',
      ),
    );
  }
}
