import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, Building2, Calendar, ArrowRight, Clock } from 'lucide-react';
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

      {/* Demo booking banner */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
            style={{ background: 'rgba(195,245,59,0.05)', border: '1px solid rgba(195,245,59,0.2)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(195,245,59,0.1)' }}>
                <Calendar size={20} style={{ color: '#c3f53b' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Want a live walkthrough?</h2>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Book a 15-minute demo and see the AI agent, draft approvals, and cross-platform dashboard in action.
                </p>
              </div>
            </div>
            <Link
              href="/book-demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap"
              style={{ background: '#c3f53b', color: '#0a0a0a' }}
            >
              Book a demo
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
            {/* Left: channels */}
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

              <div className="rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Response time</span>
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  We aim to respond to all inquiries within one business day. For enterprise and agency inquiries, we typically reply within 4 hours.
                </p>
              </div>
            </div>

            {/* Right: form */}
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
