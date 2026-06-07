import { PageHero, Section } from '@/components/marketing/sections';
import { FadeIn } from '@/components/marketing/v3/animations';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Changelog',
  description: 'Latest updates, features, and improvements to AdNexus AI.',
};

const ENTRIES = [
  {
    date: 'June 2026',
    version: 'v2.0',
    items: [
      'Complete redesign with dark-first teal/violet theme',
      'New AI Agent with autonomous anomaly detection',
      'Cross-platform unified dashboard',
      'Creative fatigue detection and alerts',
    ],
  },
  {
    date: 'May 2026',
    version: 'v1.5',
    items: [
      'Morning Brief daily digest',
      'Budget pacing insights',
      'Draft approvals workflow',
      'Snapchat Ads integration',
    ],
  },
  {
    date: 'April 2026',
    version: 'v1.0',
    items: [
      'Initial release of AdNexus AI',
      'Meta and Google Ads support',
      'Basic anomaly detection',
      'Performance analytics dashboard',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <PageHero
        badge="Changelog"
        title={<>What is <span className="text-gradient">new</span></>}
        subtitle="Latest updates, features, and improvements to the AdNexus AI platform."
      />

      <Section>
        <div className="max-w-2xl mx-auto space-y-12">
          {ENTRIES.map((entry) => (
            <FadeIn key={entry.version}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl font-semibold text-foreground">{entry.date}</h2>
                <Badge variant="teal">{entry.version}</Badge>
              </div>
              <ul className="space-y-3">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          ))}
        </div>
      </Section>
    </>
  );
}
