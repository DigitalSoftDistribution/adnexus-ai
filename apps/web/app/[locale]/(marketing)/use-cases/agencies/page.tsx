import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UseCasePainGain, UseCaseTimeline } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Agencies — AdNexus AI',
    description: 'Manage 20+ client accounts from one dashboard. White-label reports, cross-platform attribution, and AI that drafts while you approve.',
    openGraph: { title: 'Agencies — AdNexus AI', description: 'Manage 20+ client accounts from one dashboard. White-label reports, cross-platform attribution, and AI that drafts while you approve.' },
  };
}

const AGENCY_PAIN_GAIN = [
  {
    pain: 'Switching between 5+ ad managers',
    painDesc: 'Every client uses different platforms. You log into Meta, Google, TikTok, and Snap separately — wasting hours every day.',
    gain: 'One dashboard for all clients',
    gainDesc: 'All platforms, all clients, one screen. Switch accounts in one click and see cross-platform performance at a glance.',
  },
  {
    pain: 'Manual reporting every Monday',
    painDesc: 'You spend 3+ hours every Monday pulling numbers, formatting spreadsheets, and building client presentations.',
    gain: 'AI-generated reports in seconds',
    gainDesc: 'Morning Brief auto-generates performance summaries. Export white-label PDFs or share live dashboards with clients.',
  },
  {
    pain: 'Clients scared of AI mistakes',
    painDesc: 'Clients worry AI will publish bad changes to their live campaigns without asking.',
    gain: 'Draft-first approval',
    gainDesc: 'Every AI change is a draft awaiting approval. Clients see exactly what would change before it goes live.',
  },
];

const AGENCY_TIMELINE = [
  { time: '8:00 AM', oldWay: 'Log into 4 different ad managers, check spend and performance manually.', newWay: 'Morning Brief arrives with cross-platform summary and 3 draft suggestions.' },
  { time: '10:00 AM', oldWay: 'Spend 2 hours building Monday client report in Google Sheets.', newWay: 'Export white-label report PDF in 30 seconds. Send to clients.' },
  { time: '2:00 PM', oldWay: 'Notice underperforming ad set, manually adjust bids across platforms.', newWay: 'AI flagged the ad set at 9 AM. Review and approve the bid adjustment draft.' },
  { time: '5:00 PM', oldWay: 'Client calls asking why spend is up 40%. Scramble to investigate.', newWay: 'AI alerted you to the anomaly at 11 AM with root cause analysis. Already handled.' },
];

export default async function AgenciesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-12 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Use Case</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Built for agencies</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Manage 20+ client accounts from one dashboard. AI drafts optimizations — you review and approve.
        </p>
      </section>

      <Section title="The agency problem" subtitle="Click any card to see how AdNexus solves it">
        <UseCasePainGain items={AGENCY_PAIN_GAIN} />
      </Section>

      <Section title="A day in the life" subtitle="Before vs. after AdNexus">
        <UseCaseTimeline steps={AGENCY_TIMELINE} />
      </Section>

      <Section title="Agency impact" subtitle="The measurable gains agencies can expect from a draft-first AI workflow">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { value: '3+ hrs', label: 'saved on weekly reporting' },
            { value: '20+', label: 'client accounts in one workspace' },
            { value: '100%', label: 'draft-first client control' },
          ].map((metric) => (
            <div key={metric.label} className="card-surface p-5 text-center">
              <div className="font-mono-data text-3xl font-bold text-white mb-2">{metric.value}</div>
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{metric.label}</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
