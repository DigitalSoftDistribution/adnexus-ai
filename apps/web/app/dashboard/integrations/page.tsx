import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Integrations',
};

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your advertising platforms and tools.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 'Meta Ads', status: 'connected', icon: 'M' },
          { name: 'Google Ads', status: 'connected', icon: 'G' },
          { name: 'TikTok Ads', status: 'available', icon: 'T' },
          { name: 'Snapchat Ads', status: 'available', icon: 'S' },
          { name: 'Slack', status: 'available', icon: 'S' },
          { name: 'Stripe', status: 'connected', icon: 'S' },
        ].map((integration) => (
          <div key={integration.name} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold">
                  {integration.icon}
                </div>
                <div>
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{integration.status}</p>
                </div>
              </div>
              <button className="text-sm text-primary hover:underline">
                {integration.status === 'connected' ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
