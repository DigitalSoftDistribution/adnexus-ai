import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audiences',
};

export default function AudiencesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audiences</h1>
        <p className="text-muted-foreground">Manage audience segments and targeting.</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">Audiences module coming soon.</p>
      </div>
    </div>
  );
}
