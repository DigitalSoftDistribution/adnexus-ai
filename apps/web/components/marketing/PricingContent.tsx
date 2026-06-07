'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Section, PricingCard, CtaBand } from './sections';
import { FadeIn, StaggerContainer, StaggerItem } from './v3/animations';

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: '$49',
    annualPrice: '$39',
    period: '/month',
    description: 'For small teams getting started with AI-powered advertising.',
    features: [
      'Up to 5 ad accounts',
      'Meta & Google Ads',
      'Daily morning brief',
      'Basic anomaly alerts',
      'Email support',
    ],
    highlighted: false,
    cta: 'Talk to Sales',
    ctaHref: '/contact',
  },
  {
    name: 'Professional',
    monthlyPrice: '$149',
    annualPrice: '$119',
    period: '/month',
    description: 'For growing teams that need cross-platform intelligence.',
    features: [
      'Up to 20 ad accounts',
      'All platforms (Meta, Google, TikTok, Snap)',
      'Real-time anomaly detection',
      'AI optimization drafts',
      'Creative fatigue alerts',
      'Budget pacing insights',
      'Priority support',
    ],
    highlighted: true,
    cta: 'Talk to Sales',
    ctaHref: '/contact',
  },
  {
    name: 'Business',
    monthlyPrice: '$399',
    annualPrice: '$319',
    period: '/month',
    description: 'For agencies and large teams managing multiple brands.',
    features: [
      'Unlimited ad accounts',
      'All platforms + API access',
      'Custom AI models',
      'Advanced attribution',
      'White-label reports',
      'SSO & SAML',
      'Dedicated account manager',
    ],
    highlighted: false,
    cta: 'Contact Sales',
    ctaHref: '/contact',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    period: '',
    description: 'For organizations with custom compliance and integration needs.',
    features: [
      'Everything in Business',
      'Custom integrations',
      'On-premise deployment option',
      'SLA guarantee',
      'Security audits',
      'Training & onboarding',
    ],
    highlighted: false,
    cta: 'Contact Sales',
    ctaHref: '/contact',
  },
];

const FAQS = [
  {
    q: 'Can I switch plans?',
    a: 'During v1, plan changes are sales-led and handled by our team so billing and platform access stay aligned.'
  },
  {
    q: 'Is there a free trial?',
    a: 'The managed v1 pilot is sales-led. Contact us and we will recommend the right trial or onboarding path for your team.'
  },
  {
    q: 'What happens when I need more ad accounts?',
    a: 'Contact us and we will adjust your plan or create a custom arrangement for larger account portfolios.'
  },
  {
    q: 'Do you offer custom terms?',
    a: 'Yes. Enterprise and agency agreements can include custom onboarding, support, and commercial terms.'
  },
  {
    q: 'Is my data secure?',
    a: 'We use OAuth instead of platform passwords, encrypt data in transit and at rest, and apply least-privilege access controls.'
  },
];

export function PricingContent() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <Section className="pt-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <FadeIn>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Flat plans for the managed v1 pilot. Talk to us to choose the right setup.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={annual ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                Monthly
              </span>
              <Switch checked={annual} onCheckedChange={setAnnual} />
              <span className={annual ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Annual
              </span>
              {annual && (
                <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </div>
          </FadeIn>
        </div>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name}>
              <PricingCard
                name={plan.name}
                price={annual ? plan.annualPrice : plan.monthlyPrice}
                period={plan.period}
                description={plan.description}
                features={plan.features}
                highlighted={plan.highlighted}
                cta={plan.cta}
                ctaHref={plan.ctaHref}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      <Section>
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground text-center mb-10">
              Frequently asked questions
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Accordion type="single" collapsible className="space-y-4">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </Section>

      <CtaBand
        title="Still have questions?"
        subtitle="Our team is happy to help you find the right plan for your needs."
        cta="Contact Sales"
        ctaHref="/contact"
        variant="dark"
      />
    </>
  );
}
