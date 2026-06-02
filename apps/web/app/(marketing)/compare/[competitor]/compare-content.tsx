'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, MessageSquare, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompareData, ComparisonValue } from '../_data';

function Cell({ value, highlight }: { value: ComparisonValue; highlight: boolean }) {
  if (typeof value === 'boolean') {
    if (value) {
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c3f53b]/15">
          <Check size={14} className="text-[#c3f53b]" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          highlight ? 'bg-red-500/15' : 'bg-white/5',
        )}
      >
        <X size={14} className={highlight ? 'text-red-400' : 'text-gray-600'} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={cn('font-mono text-xs font-medium', highlight ? 'text-[#c3f53b]' : 'text-gray-400')}>
      {value}
    </span>
  );
}

export function CompareContent({ data }: { data: CompareData }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredCategories = activeCategory
    ? data.categories.filter((c) => c.name === activeCategory)
    : data.categories;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(195,245,59,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c3f53b]/30 bg-[#c3f53b]/10 px-4 py-1.5 text-sm font-medium text-[#c3f53b]">
            <Sparkles size={14} aria-hidden="true" />
            {data.badge}
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-[#c3f53b]">{data.headlineAccent}</span>
            <br />
            <span className="text-white">{data.headlineRest}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">{data.subtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#c3f53b] px-7 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {data.ctaLabel} <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              onClick={scrollToTable}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              See Feature Comparison
            </button>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {data.differentiators.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                  <card.icon size={20} style={{ color: card.iconColor }} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section ref={tableRef} className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Feature Comparison</h2>
            <p className="mt-4 text-gray-400">See how AdNexus AI stacks up against {data.competitor}.</p>
          </div>

          {/* Category filter pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                activeCategory === null
                  ? 'bg-[#c3f53b]/15 text-[#c3f53b]'
                  : 'border border-white/10 text-gray-400 hover:text-white',
              )}
            >
              All
            </button>
            {data.categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  activeCategory === cat.name
                    ? 'bg-[#c3f53b]/15 text-[#c3f53b]'
                    : 'border border-white/10 text-gray-400 hover:text-white',
                )}
              >
                <cat.icon size={14} aria-hidden="true" />
                {cat.name}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div
              className="grid items-center border-b border-white/10 bg-white/[0.03]"
              style={{ gridTemplateColumns: '1fr 140px 140px' }}
            >
              <div className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:px-6">
                Feature
              </div>
              <div className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#c3f53b] sm:px-6">
                AdNexus AI
              </div>
              <div className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6">
                {data.competitor}
              </div>
            </div>

            {filteredCategories.map((cat) => (
              <div key={cat.name}>
                <div
                  className="grid items-center border-b border-white/10 bg-[#c3f53b]/[0.03] px-4 py-2.5 sm:px-6"
                  style={{ gridTemplateColumns: '1fr 140px 140px' }}
                >
                  <div className="flex items-center gap-2">
                    <cat.icon size={14} className="text-[#c3f53b]" aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#c3f53b]">
                      {cat.name}
                    </span>
                  </div>
                </div>
                {cat.rows.map((row) => (
                  <div
                    key={`${cat.name}-${row.feature}`}
                    className="grid items-center border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    style={{ gridTemplateColumns: '1fr 140px 140px' }}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <span className="text-sm font-medium text-white">{row.feature}</span>
                      {row.note && (
                        <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">{row.note}</p>
                      )}
                    </div>
                    <div className="flex justify-center px-4 py-4 sm:px-6">
                      <Cell value={row.adnexus} highlight />
                    </div>
                    <div className="flex justify-center px-4 py-4 sm:px-6">
                      <Cell value={row.competitor} highlight={false} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Score summary */}
          {data.score && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#c3f53b]" />
                  <span className="text-sm font-medium text-white">
                    AdNexus AI: {data.score.adnexus} wins
                  </span>
                </div>
                <span className="text-gray-600">|</span>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-gray-600" />
                  <span className="text-sm font-medium text-gray-400">
                    {data.competitor}: {data.score.competitor} wins
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why teams choose */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">{data.whyHeading}</h2>
            <p className="mt-4 text-gray-400">{data.whySubtitle}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.whyPills.map((pill) => (
              <div key={pill.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                  <pill.icon size={20} style={{ color: pill.color }} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{pill.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{pill.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor strengths (optional) */}
      {data.competitorStrengths && data.competitorStrengths.length > 0 && (
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Where {data.competitor} Shines
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {data.competitorStrengths.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#c3f53b]/20 bg-[#c3f53b]/[0.04] p-6"
                >
                  <item.icon size={24} className="text-[#c3f53b]" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-[#c3f53b]">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial (optional) */}
      {data.testimonial && (
        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-12">
              <MessageSquare size={32} className="mx-auto mb-6 text-[#c3f53b] opacity-40" aria-hidden="true" />
              <blockquote className="text-xl font-medium leading-relaxed text-white sm:text-2xl">
                &ldquo;{data.testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center justify-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-[#c3f53b]">
                  {data.testimonial.initials}
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{data.testimonial.name}</p>
                  <p className="text-xs text-gray-500">{data.testimonial.role}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{data.ctaHeading}</h2>
          <p className="mt-4 text-gray-400">{data.ctaSubtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#c3f53b] px-7 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {data.ctaLabel} <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
