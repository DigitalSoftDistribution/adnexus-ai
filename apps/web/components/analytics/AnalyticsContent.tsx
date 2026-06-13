'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  DollarSign,
  MousePointer,
  Target,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatCard } from '@/components/charts/StatCard';
import { ChartCard } from '@/components/charts/ChartCard';
import { formatCompact, formatCurrency } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

interface SpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface AnalyticsSummary {
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
  spendSeries: SpendPoint[];
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  source: string;
  generatedAt: string;
}

function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics', 'data'],
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await fetch('/api/v2/analytics/data');
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          body?.error?.message ?? body?.message ?? 'Failed to load analytics';
        throw new Error(message);
      }
      return body.data;
    },
  });
}

export function AnalyticsContent() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const { data, isLoading, isError, error, refetch } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title={tc('error')}
        description={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const summary = data?.summary;
  const hasData = (summary?.totalCampaigns ?? 0) > 0;

  if (!hasData || !summary) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title={t('title')}
          description={t('description')}
        />
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title={t('empty')}
          description={t('emptyDescription')}
          action={
            <Button asChild>
              <Link href="/dashboard/campaigns">{t('emptyCta')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const chartData = (summary.spendSeries ?? []).map((point) => ({
    name: point.date.slice(5),
    spend: point.spend,
    conversions: point.conversions,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title={t('title')}
        description={t('description')}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('totalSpend')}
          value={formatCurrency(summary.totalSpend)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title={t('impressions')}
          value={formatCompact(summary.totalImpressions)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title={t('clicks')}
          value={formatCompact(summary.totalClicks)}
          icon={<MousePointer className="h-4 w-4" />}
        />
        <StatCard
          title={t('conversions')}
          value={formatCompact(summary.totalConversions)}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title={t('avgCtr')}
          value={`${summary.avgCtr.toFixed(2)}%`}
          className="lg:col-span-1"
        />
        <StatCard
          title={t('avgCpa')}
          value={formatCurrency(summary.avgCpa)}
          invertDelta
          className="lg:col-span-1"
        />
        <StatCard
          title={t('avgRoas')}
          value={`${summary.avgRoas.toFixed(2)}x`}
          className="lg:col-span-1"
        />
      </div>

      {chartData.length > 0 ? (
        <ChartCard
          title={t('spendTrend')}
          description={t('spendTrendDescription')}
          type="area"
          data={chartData}
          series={[
            { key: 'spend', label: t('totalSpend') },
            { key: 'conversions', label: t('conversions') },
          ]}
          xKey="name"
          height={280}
        />
      ) : null}
    </div>
  );
}
