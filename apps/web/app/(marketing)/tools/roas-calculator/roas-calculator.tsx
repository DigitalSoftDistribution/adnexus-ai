'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Target,
  BarChart3,
  Info,
} from 'lucide-react';

interface MetricResult {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const BENCHMARKS = [
  { channel: 'Meta Ads', goodRoas: '4:1', avgCtr: '0.9-1.5%', avgCvr: '2-3%', avgCpc: '$0.50-$2.00' },
  { channel: 'Google Search', goodRoas: '2:1', avgCtr: '3-5%', avgCvr: '3-5%', avgCpc: '$1.00-$3.00' },
  { channel: 'Google Shopping', goodRoas: '4:1', avgCtr: '0.5-1.5%', avgCvr: '1.5-3%', avgCpc: '$0.30-$1.50' },
  { channel: 'TikTok Ads', goodRoas: '2:1', avgCtr: '0.5-1.5%', avgCvr: '1-2%', avgCpc: '$0.20-$0.80' },
];

export function RoasCalculator() {
  const [spend, setSpend] = useState('');
  const [revenue, setRevenue] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');

  const results = useMemo<MetricResult[]>(() => {
    const s = parseFloat(spend) || 0;
    const r = parseFloat(revenue) || 0;
    const imp = parseFloat(impressions) || 0;
    const cl = parseFloat(clicks) || 0;
    const conv = parseFloat(conversions) || 0;

    const roas = s > 0 ? r / s : 0;
    const cpa = conv > 0 ? s / conv : 0;
    const cpc = cl > 0 ? s / cl : 0;
    const ctr = imp > 0 ? (cl / imp) * 100 : 0;
    const cvr = cl > 0 ? (conv / cl) * 100 : 0;

    return [
      {
        label: 'ROAS',
        value: s > 0 ? `${roas.toFixed(2)}:1` : '—',
        description:
          roas >= 4 ? 'Excellent' : roas >= 2 ? 'Good' : roas >= 1 ? 'Break-even' : 'Below target',
        icon: TrendingUp,
        color:
          roas >= 4
            ? 'text-emerald-400'
            : roas >= 2
              ? 'text-sky-400'
              : roas >= 1
                ? 'text-yellow-400'
                : 'text-red-400',
      },
      {
        label: 'ROAS %',
        value: s > 0 ? `${(roas * 100).toFixed(1)}%` : '—',
        description: 'Return on ad spend as percentage',
        icon: BarChart3,
        color: 'text-sky-400',
      },
      {
        label: 'CPA',
        value: conv > 0 ? `$${cpa.toFixed(2)}` : '—',
        description: 'Cost per acquisition',
        icon: Target,
        color: cpa > 0 && cpa <= 20 ? 'text-emerald-400' : 'text-yellow-400',
      },
      {
        label: 'CPC',
        value: cl > 0 ? `$${cpc.toFixed(2)}` : '—',
        description: 'Cost per click',
        icon: DollarSign,
        color: 'text-sky-400',
      },
      {
        label: 'CTR',
        value: imp > 0 ? `${ctr.toFixed(2)}%` : '—',
        description: 'Click-through rate',
        icon: MousePointerClick,
        color: ctr >= 1 ? 'text-emerald-400' : 'text-yellow-400',
      },
      {
        label: 'CVR',
        value: cl > 0 ? `${cvr.toFixed(2)}%` : '—',
        description: 'Conversion rate',
        icon: Target,
        color: cvr >= 2 ? 'text-emerald-400' : 'text-yellow-400',
      },
    ];
  }, [spend, revenue, impressions, clicks, conversions]);

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors placeholder:text-gray-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500';
  const smallInputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none transition-colors placeholder:text-gray-600 focus:border-sky-500';

  return (
    <>
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Inputs */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-6 text-lg font-semibold">Input Your Data</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="roas-spend" className="mb-1.5 block text-sm font-medium text-gray-400">
                    Ad Spend ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="roas-spend"
                    type="number"
                    inputMode="decimal"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value)}
                    placeholder="e.g. 5000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="roas-revenue" className="mb-1.5 block text-sm font-medium text-gray-400">
                    Revenue ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="roas-revenue"
                    type="number"
                    inputMode="decimal"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder="e.g. 20000"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="roas-impressions" className="mb-1.5 block text-sm font-medium text-gray-400">
                      Impressions
                    </label>
                    <input
                      id="roas-impressions"
                      type="number"
                      inputMode="numeric"
                      value={impressions}
                      onChange={(e) => setImpressions(e.target.value)}
                      placeholder="100000"
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="roas-clicks" className="mb-1.5 block text-sm font-medium text-gray-400">
                      Clicks
                    </label>
                    <input
                      id="roas-clicks"
                      type="number"
                      inputMode="numeric"
                      value={clicks}
                      onChange={(e) => setClicks(e.target.value)}
                      placeholder="1500"
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="roas-conversions" className="mb-1.5 block text-sm font-medium text-gray-400">
                      Conversions
                    </label>
                    <input
                      id="roas-conversions"
                      type="number"
                      inputMode="numeric"
                      value={conversions}
                      onChange={(e) => setConversions(e.target.value)}
                      placeholder="50"
                      className={smallInputClass}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-600">
                <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                All calculations happen locally in your browser. No data is sent to any server.
              </p>
            </div>

            {/* Results */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="mb-6 text-lg font-semibold">Results</h2>
              <div className="grid grid-cols-2 gap-4">
                {results.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-gray-500" aria-hidden="true" />
                        <span className="text-xs font-medium text-gray-500">{m.label}</span>
                      </div>
                      <p className={`mt-2 text-2xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="mt-1 text-xs text-gray-600">{m.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmarks */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Industry Benchmarks</h2>
          <p className="mb-8 text-center text-gray-400">
            A good ROAS is generally considered{' '}
            <span className="font-semibold text-sky-400">4:1 or higher</span> (meaning $4 revenue for
            every $1 spent).
          </p>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Channel</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">Good ROAS</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">Avg CTR</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">Avg CVR</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-400">Avg CPC</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((b) => (
                  <tr key={b.channel} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-300">{b.channel}</td>
                    <td className="px-4 py-3 text-center text-emerald-400">{b.goodRoas}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{b.avgCtr}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{b.avgCvr}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{b.avgCpc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
