import type { IBillingRepository, PlanChangeResult } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';
import {
  comparePlans,
  getPriceForPlan,
  isBillingCheckoutConfigured,
} from '../../../services/stripe';

export interface UpgradePlanInput {
  workspaceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  plan: string;
  successUrl?: string;
  cancelUrl?: string;
}

export class UpgradePlanUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: UpgradePlanInput): Promise<Result<PlanChangeResult>> {
    if (input.userRole !== 'owner') {
      return err(new ForbiddenError('Only workspace owners can change plans'));
    }

    if (!input.plan?.trim()) {
      return err(new ValidationError('Target plan is required'));
    }

    const targetPlan = input.plan.trim().toLowerCase();

    if (targetPlan === 'free') {
      return err(new ValidationError('Use downgrade to move to the free plan'));
    }

    if (!isBillingCheckoutConfigured()) {
      return err(new ValidationError('Billing checkout is not configured'));
    }

    const billingInfo = await this.billingRepo.getBillingInfo(input.workspaceId);
    if (!billingInfo) {
      return err(new ValidationError('Workspace billing record not found'));
    }

    const currentPlan = billingInfo.plan || 'free';
    if (comparePlans(currentPlan, targetPlan) <= 0) {
      return err(new ValidationError(`Cannot upgrade from ${currentPlan} to ${targetPlan}`));
    }

    // Direction is validated before price configuration — "cannot upgrade"
    // is the accurate error when the target sits below the current plan
    if (!getPriceForPlan(targetPlan)) {
      return err(new ValidationError(`Unknown or unconfigured plan: ${targetPlan}`));
    }

    const successUrl = input.successUrl || `${process.env.FRONTEND_URL}/dashboard/billing?success=true`;
    const cancelUrl = input.cancelUrl || `${process.env.FRONTEND_URL}/dashboard/billing?canceled=true`;

    const result = await this.billingRepo.upgradePlan(
      input.workspaceId,
      input.userId,
      input.userEmail,
      targetPlan,
      successUrl,
      cancelUrl,
    );

    return ok(result);
  }
}
