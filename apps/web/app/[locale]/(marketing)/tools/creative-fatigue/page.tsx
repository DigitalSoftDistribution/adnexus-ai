'use client';

import { useState } from 'react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { FadeIn } from '@/components/marketing/v3/animations';
import { AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function Page() {
  const [ctr, setCtr] = useState('');
  const [frequency, setFrequency] = useState('');
  const [days, setDays] = useState('');
  const [result, setResult] = useState<null | {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    recommendation: string;
  }>(null);
  const [error, setError] = useState('');

  const analyze = () => {
    const ctrVal = parseFloat(ctr);
    const freqVal = parseFloat(frequency);
    const daysVal = parseInt(days);

    if (
      Number.isNaN(ctrVal) || Number.isNaN(freqVal) || Number.isNaN(daysVal) ||
      ctrVal <= 0 || freqVal <= 0 || daysVal <= 0
    ) {
      setResult(null);
      setError('Enter positive numbers for CTR, frequency, and days to analyze.');
      return;
    }
    setError('');

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = '';
    let recommendation = '';

    const lowCtr = ctrVal < 1;
    const weakCtr = ctrVal < 1.5;

    if ((freqVal > 3 && daysVal > 7) || (lowCtr && freqVal > 2.5)) {
      status = 'critical';
      message = `Your creative is likely fatigued. A ${ctrVal}% CTR with a frequency of ${freqVal} over ${daysVal} days suggests audience saturation.`;
      recommendation = 'Pause this creative immediately and launch a new variant. Consider refreshing the headline and visual.';
    } else if ((freqVal > 2.5 && daysVal > 5) || weakCtr) {
      status = 'warning';
      message = `Early signs of fatigue detected. A ${ctrVal}% CTR at frequency ${freqVal} is approaching the danger zone.`;
      recommendation = 'Prepare a replacement creative. Monitor CTR daily — if it drops another 10%, swap immediately.';
    } else {
      status = 'healthy';
      message = `Your creative is performing well. A ${ctrVal}% CTR with frequency ${freqVal} shows no signs of fatigue yet.`;
      recommendation = 'Continue monitoring. Prepare a backup creative for when frequency hits 2.5 or CTR dips below 1.5%.';
    }

    setResult({ status, message, recommendation });
  };

  const statusColors = {
    healthy: { border: 'border-success', icon: 'text-success' },
    warning: { border: 'border-warning', icon: 'text-warning' },
    critical: { border: 'border-destructive', icon: 'text-destructive' },
  };

  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title={<>Creative Fatigue Detector</>}
        subtitle="Check if your ad creative is showing signs of fatigue. Get instant recommendations."
      />

      <Section>
        <FadeIn>
          <Card className="max-w-xl mx-auto border-border/60">
            <CardContent className="p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current CTR (%)</label>
                <Input type="number" step="0.1" value={ctr} onChange={(e) => setCtr(e.target.value)} placeholder="e.g. 2.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Frequency (avg impressions per user)</label>
                <Input type="number" step="0.1" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. 2.8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Days since launch</label>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 7" />
              </div>
              <Button onClick={analyze} disabled={!ctr || !frequency || !days} className="w-full">
                Analyze Creative
              </Button>
              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}
              {result && (
                <Card className={`border ${statusColors[result.status].border}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      {result.status === 'healthy' && <TrendingUp size={16} className={statusColors[result.status].icon} />}
                      {result.status === 'warning' && <AlertTriangle size={16} className={statusColors[result.status].icon} />}
                      {result.status === 'critical' && <RefreshCw size={16} className={statusColors[result.status].icon} />}
                      <span className={`text-sm font-semibold capitalize ${statusColors[result.status].icon}`}>
                        {result.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Recommendation:</strong> {result.recommendation}
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </Section>

      <CtaBand
        title="Want automated fatigue detection?"
        subtitle="AdNexus AI monitors every creative 24/7 and alerts you before performance drops."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
