import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhooks',
};

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Builder</h1>
        <p className="text-muted-foreground">Configure outgoing webhooks for event notifications.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Webhook builder coming soon.</p>
      </div>
    </div>
  );
}
