import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UseCasePainGain, UseCaseTimeline, ROICalculator } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'E-commerce — AdNexus AI',
    description: 'Scale your product ads across Meta, Google, TikTok, and Snap. AI detects creative fatigue and drafts new variants before performance drops.',
    openGraph: { title: 'E-commerce — AdNexus AI', description: 'Scale your product ads across Meta, Google, TikTok, and Snap. AI detects creative fatigue and drafts new variants before performance drops.' },
  };
}

const ECOMMERCE_PAIN_GAIN = [
  {
    pain: 'Creative fatigue kills ROAS',
    painDesc: 'Your best-performing ad creative stops working after 2 weeks. By the time you notice, ROAS has already dropped 30%.',
    gain: 'Fatigue detection before it hurts',
    gainDesc: 'AI monitors creative performance and flags fatigue early — then drafts new variants to test before the drop.',
  },
  {
    pain: 'Product feed errors everywhere',
    painDesc: 'Google Merchant Center rejects products, Meta catalog sync breaks, and you only find out when sales stop.',
    gain: 'Feed health monitoring',
    gainDesc: 'Real-time feed health checks across all platforms. Get alerted to errors before they impact sales.',
  },
  {
    pain: 'Attribution is a black box',
    painDesc: 'Meta says one thing, Google says another. You have no idea which channel actually drove the sale.',
    gain: 'Unified cross-platform attribution',
    gainDesc: 'See the true contribution of each channel with deduplicated, cross-platform attribution in one view.',
  },
];

const ECOMMERCE_TIMELINE = [
  { time: '6:00 AM', oldWay: 'Overnight sales dropped 20%. No idea why until you check manually.', newWay: 'AI detected the product feed error at 2 AM and drafted a fix. Approve and publish.' },
  { time: '9:00 AM', oldWay: 'Check yesterday\'s ROAS across 4 platforms. Spreadsheets everywhere.', newWay: 'Morning Brief shows unified ROAS: 4.2x. 2 creative drafts flagged for fatigue.' },
  { time: '11:00 AM', oldWay: 'Manually create new ad variants for the fatigued creative.', newWay: 'Review AI-generated creative variants. Approve the best one. Live in minutes.' },
  { time: '3:00 PM', oldWay: 'Client asks which channel drove the $50K sale. Guess based on last-click.', newWay: 'Show unified attribution: Meta assisted, Google closed. Data-backed answer.' },
];

export default async function EcommercePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-12 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Use Case</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Built for e-commerce</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Scale product ads across every platform. AI detects fatigue, monitors feeds, and attributes sales correctly.
        </p>
      </section>

      <Section title="The e-commerce problem" subtitle="Click any card to see how AdNexus solves it">
        <UseCasePainGain items={ECOMMERCE_PAIN_GAIN} />
      </Section>

      <Section title="A day in the life" subtitle="Before vs. after AdNexus">
        <UseCaseTimeline steps={ECOMMERCE_TIMELINE} />
      </Section>

      <Section title="ROI calculator" subtitle="See how much revenue you could protect">
        <ROICalculator />
      </Section>
    </main>
  );
}
