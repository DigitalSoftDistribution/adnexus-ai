'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ArrowRight, TrendingDown } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

export function ROICalculator() {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const [monthlySpend, setMonthlySpend] = useState(50000);
  const [toolFeePercent, setToolFeePercent] = useState(3);

  const adnexusCost = 149; // Scale plan
  const competitorCost = Math.round(monthlySpend * (toolFeePercent / 100));
  const annualSavings = (competitorCost - adnexusCost) * 12;
  const savingsPercent = competitorCost > 0 ? Math.round(((competitorCost - adnexusCost) / competitorCost) * 100) : 0;

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>Savings Calculator</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">See what flat pricing saves you</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Percentage-based tools get expensive fast. Compare your current tool cost vs AdNexus flat pricing.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeSmooth }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Inputs */}
          <div className="card-surface p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={16} style={{ color: '#c3f53b' }} />
              <span className="text-sm font-semibold text-white">Your setup</span>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Monthly ad spend
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  className="flex-1 accent-lime"
                  style={{ accentColor: '#c3f53b' }}
                />
                <span className="font-mono-data text-sm font-bold text-white w-24 text-right">
                  ${(monthlySpend / 1000).toFixed(0)}K
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Current tool fee (% of spend)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={toolFeePercent}
                  onChange={(e) => setToolFeePercent(Number(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: '#c3f53b' }}
                />
                <span className="font-mono-data text-sm font-bold text-white w-16 text-right">
                  {toolFeePercent}%
                </span>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Your current tool</div>
              <div className="font-mono-data text-2xl font-bold text-white">${competitorCost.toLocaleString()}/mo</div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {toolFeePercent}% of ${(monthlySpend / 1000).toFixed(0)}K monthly spend
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="card-surface p-6 flex flex-col justify-center" style={{ borderColor: 'rgba(195,245,59,0.3)' }}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingDown size={16} style={{ color: '#c3f53b' }} />
              <span className="text-sm font-semibold text-white">With AdNexus flat pricing</span>
            </div>

            <div className="mb-6">
              <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>AdNexus Scale plan</div>
              <div className="font-mono-data text-3xl font-bold" style={{ color: '#c3f53b' }}>${adnexusCost}/mo</div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Flat fee — never changes with spend</div>
            </div>

            <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(195,245,59,0.08)', border: '1px solid rgba(195,245,59,0.2)' }}>
              <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Annual savings</div>
              <div className="font-mono-data text-3xl font-bold text-white">${annualSavings.toLocaleString()}</div>
              <div className="text-[11px]" style={{ color: '#c3f53b' }}>{savingsPercent}% less than percentage-based pricing</div>
            </div>

            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              At ${(monthlySpend / 1000).toFixed(0)}K/month spend, a {toolFeePercent}% tool costs ${competitorCost.toLocaleString()}/mo. 
              AdNexus is flat ${adnexusCost}/mo — saving you ${annualSavings.toLocaleString()} per year.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
