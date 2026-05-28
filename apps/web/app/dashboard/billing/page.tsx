import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing',
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Billing module coming soon.</p>
      </div>
    </div>
  );
}
