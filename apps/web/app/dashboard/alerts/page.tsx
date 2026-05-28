import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alerts',
};

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">Configure performance alerts and notifications.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Alerts module coming soon.</p>
      </div>
    </div>
  );
}
