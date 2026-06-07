import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FAQCategoryTabs } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'FAQ — AdNexus AI',
    description: "Frequently asked questions about AdNexus AI. Find answers about pricing, platforms, security, and more.",
    openGraph: { title: 'FAQ — AdNexus AI', description: "Frequently asked questions about AdNexus AI. Find answers about pricing, platforms, security, and more." },
  };
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-8 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>FAQ</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Questions? Answers.</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Everything you need to know about AdNexus AI. Search or browse by category.
        </p>
      </section>

      <Section>
        <FAQCategoryTabs />
      </Section>
    </main>
  );
}
