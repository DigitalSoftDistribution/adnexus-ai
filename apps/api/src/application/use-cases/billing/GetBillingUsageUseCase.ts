import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import type { BillingUsage } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetBillingUsageInput {
  workspaceId: string;
  userRole: string;
}

export class GetBillingUsageUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: GetBillingUsageInput): Promise<Result<BillingUsage>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const usage = await this.billingRepo.getBillingUsage(input.workspaceId);
    if (!usage) {
      return err(new NotFoundError('Billing usage'));
    }

    return ok(usage);
  }
}
