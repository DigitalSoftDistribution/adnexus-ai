'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Radio, Users, MousePointer, Target, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/charts/StatCard';
import { ChartCard } from '@/components/charts/ChartCard';
import { formatCurrency, formatCompact } from '@/lib/utils';
import { platformLabel } from '@/lib/platforms';
import { useSSE } from '@/hooks/useSSE';

interface SpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface CampaignSummary {
  totalCampaigns: number;
  activeCount: number;
  pausedCount: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
  platformBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  spendSeries: SpendPoint[];
}

function useCampaignSummary() {
  return useQuery({
    queryKey: ['campaigns', 'summary'],
    queryFn: async (): Promise<CampaignSummary> => {
      const res = await fetch('/api/v2/campaigns/summary');
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = await res.json();
      return data.data;
    },
  });
}

export function DashboardContent() {
  const { data: summary, isLoading, error } = useCampaignSummary();
  const { isConnected } = useSSE();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="text-destructive text-lg font-medium">{t('failedToLoad')}</div>
        <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const series = summary?.spendSeries ?? [];
  const chartData = series.map((p) => ({
    name: p.date.slice(5),
    spend: p.spend,
    clicks: p.clicks,
  }));

  // Honest period-over-period delta: latest 7 days vs the prior 7 days. Returns
  // undefined when there isn't enough data, so StatCard hides the badge.
  function deltaFor(key: 'spend' | 'impressions' | 'clicks' | 'conversions'): number | undefined {
    if (series.length < 14) return undefined;
    const recent = series.slice(-7).reduce((s, p) => s + p[key], 0);
    const prior = series.slice(-14, -7).reduce((s, p) => s + p[key], 0);
    if (prior === 0) return undefined;
    return ((recent - prior) / prior) * 100;
  }

  const platformData = Object.entries(summary?.platformBreakdown ?? {}).map(([platform, count]) => ({
    name: platformLabel(platform),
    value: count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isConnected ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? tc('live') : tc('offline')}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalSpend')}
          value={formatCurrency(summary?.totalSpend ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          delta={deltaFor('spend')}
          deltaLabel={tc('vsLastMonth')}
          invertDelta
          sparkline={series.map((p) => p.spend)}
        />
        <StatCard
          title={tc('impressions')}
          value={formatCompact(summary?.totalImpressions ?? 0)}
          icon={<Users className="h-4 w-4" />}
          delta={deltaFor('impressions')}
          deltaLabel={tc('vsLastMonth')}
          sparkline={series.map((p) => p.impressions)}
        />
        <StatCard
          title={tc('clicks')}
          value={formatCompact(summary?.totalClicks ?? 0)}
          icon={<MousePointer className="h-4 w-4" />}
          delta={deltaFor('clicks')}
          deltaLabel={tc('vsLastMonth')}
          sparkline={series.map((p) => p.clicks)}
        />
        <StatCard
          title={tc('conversions')}
          value={formatCompact(summary?.totalConversions ?? 0)}
          icon={<Target className="h-4 w-4" />}
          delta={deltaFor('conversions')}
          deltaLabel={tc('vsLastMonth')}
          sparkline={series.map((p) => p.conversions)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={t('performanceOverview')}
          description={t('performanceDescription')}
          type="area"
          data={chartData}
          xKey="name"
          series={[
            { key: 'spend', label: tc('spend') },
            { key: 'clicks', label: tc('clicks'), color: 'hsl(var(--chart-2))' },
          ]}
          valueFormatter={(v) => formatCompact(v)}
        />

        {platformData.length > 0 ? (
          <ChartCard
            title={t('platformBreakdown')}
            description={t('platformDescription')}
            type="donut"
            data={platformData}
            xKey="name"
            series={[{ key: 'value', label: tc('campaign') }]}
            height={260}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('platformBreakdown')}</CardTitle>
              <CardDescription>{t('platformDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              {tc('noResults')}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t('avgCtr')} value={`${((summary?.avgCtr ?? 0) * 100).toFixed(2)}%`} />
        <StatCard title={t('avgCpa')} value={formatCurrency(summary?.avgCpa ?? 0)} />
        <StatCard title={t('avgRoas')} value={`${(summary?.avgRoas ?? 0).toFixed(2)}x`} />
      </div>
    </div>
  );
}
