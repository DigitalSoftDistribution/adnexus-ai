import type { IBillingRepository } from '../../../domain/repositories/IBillingRepository';
import type { CheckoutSession } from '../../../domain/repositories/IBillingRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';
import { getPlanForPrice, isBillingCheckoutConfigured } from '../../../services/stripe';

export interface CreateCheckoutSessionInput {
  workspaceId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export class CreateCheckoutSessionUseCase {
  constructor(private billingRepo: IBillingRepository) {}

  async execute(input: CreateCheckoutSessionInput): Promise<Result<CheckoutSession>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Only workspace owners and admins can manage billing'));
    }

    if (!input.priceId) {
      return err(new ValidationError('Price ID is required'));
    }

    if (!isBillingCheckoutConfigured()) {
      return err(new ValidationError('Billing checkout is not configured'));
    }

    if (!getPlanForPrice(input.priceId)) {
      return err(new ValidationError('Unknown Stripe price ID'));
    }

    const successUrl = input.successUrl || `${process.env.FRONTEND_URL}/dashboard/billing?success=true`;
    const cancelUrl = input.cancelUrl || `${process.env.FRONTEND_URL}/dashboard/billing?canceled=true`;

    const session = await this.billingRepo.createCheckoutSession(
      input.workspaceId,
      input.userId,
      input.userEmail,
      input.priceId,
      successUrl,
      cancelUrl,
    );

    return ok(session);
  }
}
