'use client';

import { useState } from 'react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { ScrollReveal } from '@/components/marketing/v2/animations';
import { AlertTriangle, RefreshCw, TrendingDown } from 'lucide-react';

export default function Page() {
  const [ctr, setCtr] = useState('');
  const [frequency, setFrequency] = useState('');
  const [days, setDays] = useState('');
  const [result, setResult] = useState<null | {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    recommendation: string;
  }>(null);

  const analyze = () => {
    const ctrVal = parseFloat(ctr);
    const freqVal = parseFloat(frequency);
    const daysVal = parseInt(days);

    if (!ctrVal || !freqVal || !daysVal) return;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = '';
    let recommendation = '';

    if (freqVal > 3 && daysVal > 7) {
      status = 'critical';
      message = `Your creative is likely fatigued. Frequency of ${freqVal} over ${daysVal} days suggests audience saturation.`;
      recommendation = 'Pause this creative immediately and launch a new variant. Consider refreshing the headline and visual.';
    } else if (freqVal > 2.5 && daysVal > 5) {
      status = 'warning';
      message = `Early signs of fatigue detected. Frequency at ${freqVal} is approaching the danger zone.`;
      recommendation = 'Prepare a replacement creative. Monitor CTR daily — if it drops another 10%, swap immediately.';
    } else {
      status = 'healthy';
      message = 'Your creative is performing well. No signs of fatigue yet.';
      recommendation = 'Continue monitoring. Prepare a backup creative for when frequency hits 2.5.';
    }

    setResult({ status, message, recommendation });
  };

  const statusColors = {
    healthy: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: '#10B981' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '#F59E0B' },
    critical: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: '#EF4444' },
  };

  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title={
          <>
            Creative Fatigue{' '}
            <span style={{ color: '#c3f53b' }}>Detector</span>
          </>
        }
        subtitle="Check if your ad creative is showing signs of fatigue. Get instant recommendations."
      />

      <Section>
        <ScrollReveal>
          <div
            className="max-w-xl mx-auto rounded-xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="space-y-5">
              {/* CTR Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Current CTR (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ctr}
                  onChange={(e) => setCtr(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white bg-transparent outline-none"
                  style={{
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>

              {/* Frequency Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Frequency (avg impressions per user)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g. 2.8"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white bg-transparent outline-none"
                  style={{
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>

              {/* Days Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Days since launch
                </label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white bg-transparent outline-none"
                  style={{
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>

              {/* Analyze Button */}
              <button
                onClick={analyze}
                disabled={!ctr || !frequency || !days}
                className="w-full py-3 text-sm font-bold rounded-lg transition-all disabled:opacity-30"
                style={{ background: '#c3f53b', color: '#0a0a0a' }}
              >
                Analyze Creative
              </button>

              {/* Result */}
              {result && (
                <div
                  className="rounded-lg p-4 mt-4"
                  style={{
                    background: statusColors[result.status].bg,
                    border: `1px solid ${statusColors[result.status].border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.status === 'healthy' && <TrendingDown size={16} style={{ color: statusColors[result.status].icon }} />}
                    {result.status === 'warning' && <AlertTriangle size={16} style={{ color: statusColors[result.status].icon }} />}
                    {result.status === 'critical' && <RefreshCw size={16} style={{ color: statusColors[result.status].icon }} />}
                    <span
                      className="text-sm font-semibold capitalize"
                      style={{ color: statusColors[result.status].icon }}
                    >
                      {result.status}
                    </span>
                  </div>
                  <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {result.message}
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    <strong>Recommendation:</strong> {result.recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </Section>

      <CtaBand
        title="Want automated fatigue detection?"
        subtitle="AdNexus AI monitors every creative 24/7 and alerts you before performance drops."
      />
    </>
  );
}
