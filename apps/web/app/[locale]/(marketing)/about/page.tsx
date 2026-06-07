import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CompanyTimeline, TeamGrid, PressMentions } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'About — AdNexus AI',
    description: 'AdNexus AI is the campaign workspace for modern marketers. Built by a team that believes AI should assist, not replace.',
    openGraph: { title: 'About — AdNexus AI', description: 'AdNexus AI is the campaign workspace for modern marketers. Built by a team that believes AI should assist, not replace.' },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-12 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Our Story</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Built by marketers, for marketers</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          We believe AI should assist, not replace. Every feature is designed to amplify human judgment — not override it.
        </p>
      </section>

      <Section title="Our journey" subtitle="From idea to public launch">
        <CompanyTimeline />
      </Section>

      <Section title="The team" subtitle="Small team, big ambition">
        <TeamGrid />
      </Section>

      <Section title="Press" subtitle="What others are saying about us">
        <PressMentions />
      </Section>
    </main>
  );
}
