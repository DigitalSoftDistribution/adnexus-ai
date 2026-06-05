import type { Metadata } from 'next';
import { Mail, MessageSquare, Building2 } from 'lucide-react';
import { PageHero, Section } from '@/components/marketing/sections';
import { ContactForm } from '@/components/marketing/ContactForm';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the AdNexus AI team — sales questions, agency pricing, security reviews, or product feedback.',
  alternates: { canonical: '/contact' },
};

const CHANNELS = [
  { icon: <Mail size={20} />, title: 'Email', detail: 'hello@adnexus.ai' },
  { icon: <Building2 size={20} />, title: 'Sales & Agencies', detail: 'Custom plans and onboarding' },
  { icon: <MessageSquare size={20} />, title: 'Support', detail: 'Within one business day' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let&apos;s talk</>}
        subtitle="Sales, security reviews, agency pricing, or product feedback — we'd love to hear from you."
      />
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 max-w-5xl mx-auto">
          <div className="space-y-4">
            {CHANNELS.map((c) => (
              <Card key={c.title} className="border-border/60">
                <CardContent className="pt-6 flex items-start gap-3">
                  <div className="mt-0.5 text-primary">{c.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">{c.title}</h3>
                    <p className="text-[13px] text-muted-foreground">{c.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
