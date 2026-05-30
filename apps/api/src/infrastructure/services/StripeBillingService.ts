import type { IBillingService, CheckoutSessionInput, CheckoutSessionOutput, Invoice } from '../../application/ports/IBillingService';
import { logger } from '../../lib/logger';

export class StripeBillingService implements IBillingService {
  async createCustomer(email: string, name: string, workspaceId: string): Promise<string> {
    const stripe = await this.getStripe();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { workspaceId },
    });
    return customer.id;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionOutput> {
    const stripe = await this.getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: input.planId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { workspaceId: input.workspaceId },
    });
    return { sessionId: session.id, url: session.url ?? '' };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const stripe = await this.getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = await this.getStripe();
    await stripe.subscriptions.cancel(subscriptionId);
  }

  async getInvoices(customerId: string, limit = 10): Promise<Invoice[]> {
    const stripe = await this.getStripe();
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      status: inv.status ?? 'unknown',
      createdAt: new Date(inv.created * 1000),
      pdfUrl: inv.invoice_pdf,
    }));
  }

  private async getStripe() {
    const Stripe = (await import('stripe')).default;
    return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as any });
  }
}
