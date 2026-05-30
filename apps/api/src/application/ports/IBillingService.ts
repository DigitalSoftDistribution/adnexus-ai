export interface CheckoutSessionInput {
  workspaceId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionOutput {
  sessionId: string;
  url: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  pdfUrl: string | null;
}

export interface IBillingService {
  createCustomer(email: string, name: string, workspaceId: string): Promise<string>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionOutput>;
  createPortalSession(customerId: string, returnUrl: string): Promise<string>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getInvoices(customerId: string, limit?: number): Promise<Invoice[]>;
}
