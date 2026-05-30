import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import type { BillingInfo } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetBillingInfoInput {
  workspaceId: string;
  userRole: string;
}

export class GetBillingInfoUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: GetBillingInfoInput): Promise<Result<BillingInfo>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const info = await this.billingRepo.getBillingInfo(input.workspaceId);
    if (!info) {
      return err(new NotFoundError('Billing info'));
    }

    return ok(info);
  }
}
