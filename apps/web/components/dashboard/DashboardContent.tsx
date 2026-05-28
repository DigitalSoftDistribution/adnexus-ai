'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, Users, MousePointer, Target, DollarSign } from 'lucide-react';

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
  const { data: summary, isLoading } = useCampaignSummary();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Spend',
      value: formatCurrency(summary?.totalSpend ?? 0),
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
    },
    {
      title: 'Impressions',
      value: formatNumber(summary?.totalImpressions ?? 0),
      change: '+8.2%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      title: 'Clicks',
      value: formatNumber(summary?.totalClicks ?? 0),
      change: '-2.1%',
      trend: 'down' as const,
      icon: MousePointer,
    },
    {
      title: 'Conversions',
      value: formatNumber(summary?.totalConversions ?? 0),
      change: '+15.3%',
      trend: 'up' as const,
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your advertising performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                  {stat.change}
                </span>
                {' '}vs last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Campaign performance over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart component placeholder — integrate recharts here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Campaigns by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary?.platformBreakdown ?? {}).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{platform}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Avg CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPercent(summary?.avgCtr ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg CPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary?.avgCpa ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(summary?.avgRoas ?? 0).toFixed(2)}x</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
