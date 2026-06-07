import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactPaths } from '@/components/marketing/v4';
import { ContactForm } from '@/components/marketing/ContactForm';
import { Section } from '@/components/marketing/sections';
import { Mail, MapPin, Clock } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Contact — AdNexus AI',
    description: 'Get in touch with AdNexus AI. Book a demo, get support, or explore partnerships.',
    openGraph: { title: 'Contact — AdNexus AI', description: 'Get in touch with AdNexus AI. Book a demo, get support, or explore partnerships.' },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-8 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Contact</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">How can we help?</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Choose the path that fits your needs. We respond to every message.
        </p>
      </section>

      <Section>
        <ContactPaths />
      </Section>

      <Section id="contact-form" title="Send us a message" subtitle="Sales, support, partnerships, and press inquiries all land with the right team.">
        <div className="max-w-2xl mx-auto">
          <ContactForm />
        </div>
      </Section>

      <section className="pb-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Mail size={14} style={{ color: 'var(--text-tertiary)' }} />
              hello@adnexus.ai
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
              Remote-first, EU-based
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
              Response: &lt; 4 hours
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
