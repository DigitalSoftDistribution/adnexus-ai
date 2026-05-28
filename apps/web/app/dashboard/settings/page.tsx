import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace settings.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Settings module coming soon.</p>
      </div>
    </div>
  );
}
