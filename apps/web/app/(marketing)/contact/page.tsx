import type { Metadata } from 'next';
import { Mail, MessageSquare, Building2 } from 'lucide-react';
import { PageHero, Section } from '@/components/marketing/sections';
import { ContactForm } from '@/components/marketing/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the AdNexus AI team — sales questions, agency pricing, security reviews, or product feedback. We respond within one business day.',
  alternates: { canonical: '/contact' },
};

const CHANNELS = [
  { icon: <Mail size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Email', detail: 'hello@adnexus.ai' },
  { icon: <Building2 size={20} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Sales & Agencies', detail: 'Custom plans and onboarding' },
  { icon: <MessageSquare size={20} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Support', detail: 'Within one business day' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let&apos;s <span style={{ color: '#c3f53b' }}>talk</span></>}
        subtitle="Sales, security reviews, agency pricing, or product feedback — we'd love to hear from you."
      />
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 max-w-5xl mx-auto">
          <div className="space-y-4">
            {CHANNELS.map((c) => (
              <div key={c.title} className="card-surface p-5 flex items-start gap-3">
                <div className="mt-0.5">{c.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">{c.title}</h3>
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
