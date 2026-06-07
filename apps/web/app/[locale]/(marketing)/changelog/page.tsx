import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ChangelogTimeline } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Changelog — AdNexus AI',
    description: "See what's new, improved, and fixed in AdNexus AI. Filter by release type.",
    openGraph: { title: 'Changelog — AdNexus AI', description: "See what's new, improved, and fixed in AdNexus AI. Filter by release type." },
  };
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-8 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Updates</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Changelog</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Track every improvement, new feature, and fix as we ship them.
        </p>
      </section>

      <Section>
        <ChangelogTimeline />
      </Section>
    </main>
  );
}
