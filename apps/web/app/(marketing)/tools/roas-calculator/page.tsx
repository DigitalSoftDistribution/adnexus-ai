import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calculator } from 'lucide-react';
import { RoasCalculator } from './roas-calculator';
import {
  breadcrumbSchema,
  webApplicationSchema,
  jsonLd,
} from '@/lib/structured-data';

const PAGE_PATH = '/tools/roas-calculator';

export const metadata: Metadata = {
  title: 'ROAS Calculator',
  description:
    'Free ROAS calculator for Meta, Google, and TikTok ads. Calculate ROAS, CPA, CPC, CTR, and CVR instantly with industry benchmarks. No signup required.',
  keywords: [
    'ROAS calculator',
    'return on ad spend',
    'CPA calculator',
    'CTR',
    'CVR',
    'Meta ads',
    'Google ads',
    'TikTok ads',
  ],
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: 'Free ROAS Calculator | AdNexus AI',
    description:
      'Calculate Return on Ad Spend, CPA, CPC, CTR, and CVR instantly. Compare against industry benchmarks.',
    url: PAGE_PATH,
    type: 'website',
  },
};

export default function RoasCalculatorPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Tools', path: '/tools' },
              { name: 'ROAS Calculator', path: PAGE_PATH },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            webApplicationSchema({
              name: 'ROAS Calculator',
              description:
                'Free calculator for Return on Ad Spend, CPA, CPC, CTR, and CVR across Meta, Google, and TikTok ads.',
              path: PAGE_PATH,
            }),
          ),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-12 pt-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),transparent)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium text-sky-400 ring-1 ring-white/10">
            <Calculator size={14} aria-hidden="true" /> Free Tool
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">ROAS Calculator</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Calculate your Return on Ad Spend, CPA, CPC, CTR, and CVR instantly. Compare against
            industry benchmarks.
          </p>
        </div>
      </section>

      <RoasCalculator />

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop Calculating. <span className="text-[#c3f53b]">Start Optimizing.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Connect your ad account and AdNexus AI will track ROAS, CPA, and all metrics automatically
            with AI-powered recommendations to improve them.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#c3f53b] px-8 py-3 font-semibold text-black transition-opacity hover:opacity-90"
          >
            Start Free Trial <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
