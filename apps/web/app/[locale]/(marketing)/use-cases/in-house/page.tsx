import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UseCasePainGain, UseCaseTimeline } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'In-House Teams — AdNexus AI',
    description: 'One marketer managing $500K+ monthly spend. AI drafts optimizations, monitors budgets, and alerts you to anomalies — all awaiting your approval.',
    openGraph: { title: 'In-House Teams — AdNexus AI', description: 'One marketer managing $500K+ monthly spend. AI drafts optimizations, monitors budgets, and alerts you to anomalies — all awaiting your approval.' },
  };
}

const INHOUSE_PAIN_GAIN = [
  {
    pain: 'Too many campaigns, too little time',
    painDesc: 'You manage 50+ campaigns across 4 platforms. Something breaks every day and you can\'t catch it all.',
    gain: 'AI watches everything 24/7',
    gainDesc: 'The AI agent monitors all campaigns continuously. It drafts fixes for issues and alerts you to anomalies before they cost money.',
  },
  {
    pain: 'Budget overruns surprise you',
    painDesc: 'You find out a campaign overspent by $10K when you check the dashboard — usually too late.',
    gain: 'Proactive budget alerts',
    gainDesc: 'AI predicts spend trajectory and alerts you before budgets are exceeded. Draft budget adjustments ready to approve.',
  },
  {
    pain: 'No time for strategy',
    painDesc: 'You spend 80% of your day on tactical execution. Strategy and testing never get attention.',
    gain: 'Tactical execution automated',
    gainDesc: 'AI handles bid adjustments, budget reallocation, and creative rotation. You focus on strategy, testing, and growth.',
  },
];

const INHOUSE_TIMELINE = [
  { time: '7:00 AM', oldWay: 'Check 4 dashboards for overnight performance. 30 minutes gone.', newWay: 'Morning Brief: 1 anomaly detected, 2 drafts ready. Review in 5 minutes.' },
  { time: '9:00 AM', oldWay: 'Meeting with finance about last month\'s $15K budget overrun.', newWay: 'Finance sees live spend tracking. No surprises. No meetings needed.' },
  { time: '11:00 AM', oldWay: 'Manually adjust bids on 20 ad sets based on weekend performance.', newWay: 'Review AI bid adjustment drafts. Approve all 20 in 2 minutes.' },
  { time: '2:00 PM', oldWay: 'Finally have time to think about Q3 strategy. Brain is fried.', newWay: 'Spend the afternoon on A/B test planning and audience expansion strategy.' },
];

export default async function InHousePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-12 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Use Case</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Built for in-house teams</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          One marketer, $500K+ monthly spend. AI handles the tactical work — you focus on strategy.
        </p>
      </section>

      <Section title="The in-house problem" subtitle="Click any card to see how AdNexus solves it">
        <UseCasePainGain items={INHOUSE_PAIN_GAIN} />
      </Section>

      <Section title="A day in the life" subtitle="Before vs. after AdNexus">
        <UseCaseTimeline steps={INHOUSE_TIMELINE} />
      </Section>

      <Section title="Strategic time reclaimed" subtitle="Move tactical monitoring into AI drafts and keep humans on strategy">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { value: '24/7', label: 'campaign monitoring coverage' },
            { value: '5 min', label: 'morning anomaly review' },
            { value: '20', label: 'bid drafts reviewed in minutes' },
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
