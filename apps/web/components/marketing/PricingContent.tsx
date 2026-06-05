'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Check, X, Sparkles, CreditCard, Shield, Headphones, ArrowRight } from 'lucide-react';
import { PRICING_TIERS, formatPrice } from '@/lib/marketing/pricing';
import { FadeIn } from './v3/animations';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    q: 'Can I switch plans or cancel anytime?',
    a: "Yes. Upgrade, downgrade, or cancel at any time from billing settings. If you cancel, you keep access until the end of your current period.",
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'Start any paid plan with a 14-day free trial — no credit card required. At the end you can subscribe, or your account drops to the free tier automatically.',
  },
  {
    q: 'Does pricing scale with my ad spend?',
    a: "No — and that's the point. Our pricing is flat. Unlike competitors, your bill does not grow when your managed ad spend grows.",
  },
  {
    q: 'Which ad platforms are supported?',
    a: 'Growth covers Meta and Google. Scale and Agency add TikTok and Snapchat — all four major platforms in one unified dashboard.',
  },
  {
    q: 'Do you offer agency or volume pricing?',
    a: 'The Agency plan is built for agencies and high-spend brands. For custom requirements or very large teams, contact sales for tailored pricing.',
  },
];

export function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={13} aria-hidden="true" />
              Flat, transparent pricing
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-foreground mb-5">
              Pricing that scales with your strategy, not your spend
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed text-muted-foreground">
              Start free for 14 days. No credit card required. Your bill never rises just because your ad budget does.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} aria-label="Toggle annual billing" />
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ml-1 bg-primary/15 text-primary">2 months free</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Trust badges */}
      <section className="pb-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[
            { icon: <Check size={15} className="text-primary" aria-hidden="true" />, label: '14-day free trial' },
            { icon: <CreditCard size={15} className="text-primary" aria-hidden="true" />, label: 'No credit card required' },
            { icon: <Shield size={15} className="text-primary" aria-hidden="true" />, label: 'Cancel anytime' },
            { icon: <Headphones size={15} className="text-primary" aria-hidden="true" />, label: 'Support included' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {b.icon}
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tier cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRICING_TIERS.map((tier, index) => {
            const monthly = tier.monthlyPrice;
            const annualMonthly = tier.annualMonthlyPrice;
            const displayPrice = isAnnual ? annualMonthly : monthly;
            return (
              <FadeIn key={tier.id} delay={index * 0.08}>
                <Card className={`relative h-full flex flex-col ${tier.popular ? 'border-primary ring-1 ring-primary' : 'border-border/60'}`}>
                  {tier.popular && (
                    <div className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase bg-primary text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-4xl font-medium text-foreground">{formatPrice(displayPrice)}</span>
                        {displayPrice !== null && displayPrice > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                      </div>
                      {isAnnual && monthly !== null && monthly > 0 && (
                        <span className="text-xs mt-1 block text-primary">billed annually</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <Button className="w-full mb-6" variant={tier.popular ? 'default' : 'outline'} asChild>
                      <Link href={tier.ctaHref}>{tier.cta}</Link>
                    </Button>
                    <div className="pt-5 border-t border-border">
                      <span className="text-[10px] font-semibold uppercase tracking-widest mb-3 block text-muted-foreground">
                        What&apos;s included
                      </span>
                      <ul className="space-y-2.5">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <Check size={16} className="flex-shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                            <span className="text-sm text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      {tier.notIncluded.length > 0 && (
                        <>
                          <span className="text-[10px] font-semibold uppercase tracking-widest mt-5 mb-3 block text-muted-foreground">
                            Not included
                          </span>
                          <ul className="space-y-2">
                            {tier.notIncluded.map((nf) => (
                              <li key={nf} className="flex items-start gap-2.5">
                                <X size={14} className="flex-shrink-0 mt-0.5 text-muted-foreground/50" aria-hidden="true" />
                                <span className="text-sm line-through text-muted-foreground/50">{nf}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
        <p className="text-center text-xs mt-8 text-muted-foreground">All prices in USD. Taxes may apply based on your region.</p>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-12 text-center p-8 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Still have questions?</h3>
            <p className="text-sm mb-5 max-w-md mx-auto text-muted-foreground">
              Our team responds within one business day. Reach out and we&apos;ll help you find the right plan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild>
                <Link href="/auth/signup">
                  Start Free Trial <ArrowRight size={15} className="ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
