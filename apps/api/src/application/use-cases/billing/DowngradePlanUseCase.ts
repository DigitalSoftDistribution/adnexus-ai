import type { IBillingRepository, PlanChangeResult } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';
import {
  comparePlans,
  getPlanRank,
  getPriceForPlan,
  isBillingCheckoutConfigured,
} from '../../../services/stripe';

export interface DowngradePlanInput {
  workspaceId: string;
  userRole: string;
  plan: string;
}

export class DowngradePlanUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: DowngradePlanInput): Promise<Result<PlanChangeResult>> {
    if (input.userRole !== 'owner') {
      return err(new ForbiddenError('Only workspace owners can change plans'));
    }

    if (!input.plan?.trim()) {
      return err(new ValidationError('Target plan is required'));
    }

    const targetPlan = input.plan.trim().toLowerCase();

    if (!isBillingCheckoutConfigured()) {
      return err(new ValidationError('Billing checkout is not configured'));
    }

    const billingInfo = await this.billingRepo.getBillingInfo(input.workspaceId);
    if (!billingInfo) {
      return err(new ValidationError('Workspace billing record not found'));
    }

    const currentPlan = billingInfo.plan || 'free';
    if (getPlanRank(currentPlan) <= getPlanRank('free')) {
      return err(new ValidationError('No paid subscription to downgrade'));
    }

    if (comparePlans(currentPlan, targetPlan) >= 0) {
      return err(new ValidationError(`Cannot downgrade from ${currentPlan} to ${targetPlan}`));
    }

    // Direction is validated before price configuration — "cannot downgrade"
    // is the accurate error when the target sits above the current plan
    if (targetPlan !== 'free' && !getPriceForPlan(targetPlan)) {
      return err(new ValidationError(`Unknown or unconfigured plan: ${targetPlan}`));
    }

    const result = await this.billingRepo.downgradePlan(input.workspaceId, targetPlan);
    return ok(result);
  }
}
