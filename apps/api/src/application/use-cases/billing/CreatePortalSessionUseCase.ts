import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import type { PortalSession } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface CreatePortalSessionInput {
  workspaceId: string;
  userRole: string;
  returnUrl?: string;
}

export class CreatePortalSessionUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: CreatePortalSessionInput): Promise<Result<PortalSession>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only workspace owners and admins can manage billing'));
    }

    const returnUrl = input.returnUrl || `${process.env.FRONTEND_URL}/dashboard/billing`;

    const session = await this.billingRepo.createPortalSession(input.workspaceId, returnUrl);
    return ok(session);
  }
}
