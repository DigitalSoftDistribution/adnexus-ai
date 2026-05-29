import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and schedule performance reports.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Reports module coming soon.</p>
      </div>
    </div>
  );
}
