import type { Metadata } from 'next';
import { Calendar, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { ContactForm } from '@/components/marketing/ContactForm';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Book a Demo',
  description:
    'Book a 15-minute demo of AdNexus AI. See the draft-first approval workflow, AI agent, and cross-platform dashboard in action.',
  alternates: { canonical: '/book-demo' },
};

const DEMO_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'AdNexus AI Product Demo',
  description: 'A 15-minute walkthrough of the AdNexus AI campaign workspace.',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  organizer: {
    '@type': 'Organization',
    name: 'AdNexus AI',
    url: 'https://adnexus.ai',
  },
};

const WHAT_TO_EXPECT = [
  {
    icon: <Clock size={18} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: '15 minutes',
    desc: 'A focused walkthrough of the features that matter to you.',
  },
  {
    icon: <Users size={18} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Live Q&A',
    desc: 'Ask anything about platforms, pricing, security, or roadmap.',
  },
  {
    icon: <Calendar size={18} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'No pressure',
    desc: 'No sales tactics. Just a product walkthrough and honest answers.',
  },
];

const DEMO_POINTS = [
  'How the AI agent monitors campaigns 24/7',
  'The draft-first approval workflow',
  'Cross-platform unification (Meta, Google, TikTok, Snap)',
  'MCP integration with Claude and ChatGPT',
  'Pricing and team onboarding',
];

export default function BookDemoPage() {
  return (
    <>
      <JsonLd data={DEMO_JSONLD} />
      <PageHero
        eyebrow="Demo"
        title={<>See AdNexus in <span style={{ color: '#c3f53b' }}>action</span></>}
        subtitle="Book a 15-minute walkthrough. We'll show you the agent, the approval workflow, and answer every question you have."
      />

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 max-w-5xl mx-auto">
          {/* Left: info */}
          <div className="space-y-6">
            <div>
              <h2 className="font-space text-xl font-semibold text-white mb-4">What to expect</h2>
              <div className="space-y-3">
                {WHAT_TO_EXPECT.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">We&apos;ll cover</h3>
              <ul className="space-y-2">
                {DEMO_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#c3f53b' }} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(195,245,59,0.05)', border: '1px solid rgba(195,245,59,0.15)' }}>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-white font-medium">Rather start on your own?</span>{' '}
                You can connect your accounts and see the first AI drafts in two minutes — no demo required.
              </p>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <div className="card-surface p-6">
              <h2 className="font-space text-lg font-semibold text-white mb-1">Request a demo</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>
                Fill out the form and we&apos;ll reach out within one business day to schedule.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Start free while you wait"
        subtitle="Connect your platforms and see the first AI drafts today. No credit card required."
        primaryLabel="Start Free Trial"
        primaryHref="/auth/signup"
        secondaryLabel="View pricing"
        secondaryHref="/pricing"
      />
    </>
  );
}
