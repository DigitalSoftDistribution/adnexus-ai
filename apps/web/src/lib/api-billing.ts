import { api } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Subscription {
  plan: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  nextBilling: string;
  paymentMethod: {
    type: string;
    last4: string;
    expiry: string;
  };
}

export interface CreditUsage {
  used: number;
  limit: number;
  resetDate: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  pdfUrl?: string;
}

let MOCK_SUBSCRIPTION: Subscription = {
  plan: 'Pro',
  price: 99,
  interval: 'monthly',
  features: ['Unlimited campaigns', '20 connected accounts', '500 AI executions/mo', 'Slack integration', 'Team collaboration (5 seats)', 'API access', 'MCP server'],
  nextBilling: '2026-07-20',
  paymentMethod: { type: 'Visa', last4: '4242', expiry: '12/27' },
};

let MOCK_CREDITS: CreditUsage = { used: 347, limit: 500, resetDate: '2026-07-01' };

let MOCK_INVOICES: Invoice[] = [
  { id: 'inv_1', date: '2026-06-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_2', date: '2026-05-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_3', date: '2026-04-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_4', date: '2026-03-15', amount: 99.00, status: 'Paid' },
];

export const billingApi = {
  async subscription(): Promise<Subscription> {
    await delay(300);
    return { ...MOCK_SUBSCRIPTION };
  },
  async credits(): Promise<CreditUsage> {
    await delay(300);
    return { ...MOCK_CREDITS };
  },
  async invoices(): Promise<Invoice[]> {
    await delay(300);
    return [...MOCK_INVOICES];
  },
  async createPortalSession(): Promise<{ url: string }> {
    await delay(500);
    return { url: 'https://billing.stripe.com/session/test_' + Math.random().toString(36).slice(2, 10) };
  },
};
