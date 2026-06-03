'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ChartCard } from '@/components/charts/ChartCard';
import { formatCompact } from '@/lib/utils';
import { BarChart3, Plus, FileText, Calendar, Download, TrendingUp, Users, DollarSign } from 'lucide-react';

interface SummarySeriesPoint {
  date: string;
  spend: number;
  clicks: number;
  conversions: number;
}

function useSummarySeries() {
  const { data } = useQuery({
    queryKey: ['campaigns', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/v2/campaigns/summary');
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });
  return (data?.data?.spendSeries ?? []) as SummarySeriesPoint[];
}

interface Report {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

function useReports() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/v2/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });

  const reports: Report[] = data?.data?.reports ?? [];

  return { reports, isLoading, activeCategory, setActiveCategory, total: data?.data?.total ?? 0 };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'performance' | 'financial' | 'audience' | 'creative';
}

export function ReportsContent() {
  const { reports, isLoading, activeCategory, setActiveCategory, total } = useReports();
  const series = useSummarySeries();
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const previewData = series.map((p) => ({
    name: p.date.slice(5),
    spend: p.spend,
    conversions: p.conversions,
  }));

  const templates: ReportTemplate[] = [
    {
      id: 'performance-summary',
      name: t('templates.performanceSummary.name'),
      description: t('templates.performanceSummary.description'),
      icon: TrendingUp,
      category: 'performance',
    },
    {
      id: 'campaign-comparison',
      name: t('templates.campaignComparison.name'),
      description: t('templates.campaignComparison.description'),
      icon: BarChart3,
      category: 'performance',
    },
    {
      id: 'spend-breakdown',
      name: t('templates.spendBreakdown.name'),
      description: t('templates.spendBreakdown.description'),
      icon: DollarSign,
      category: 'financial',
    },
    {
      id: 'audience-insights',
      name: t('templates.audienceInsights.name'),
      description: t('templates.audienceInsights.description'),
      icon: Users,
      category: 'audience',
    },
  ];

  const filteredTemplates = activeCategory === 'all'
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  const categories = ['all', 'performance', 'financial', 'audience', 'creative'] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('newReport')}
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label={t('totalReports')} value={String(total)} icon={FileText} />
            <StatCard label={t('saved')} value={String(reports.length)} icon={Calendar} />
            <StatCard label={t('generatedToday')} value="0" icon={BarChart3} />
            <StatCard label={t('downloads')} value="0" icon={Download} />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="capitalize"
              >
                {t(`categories.${cat}`)}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="capitalize text-xs">{t(`categories.${template.category}`)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Performance preview */}
      {previewData.length > 0 && (
        <ChartCard
          title={t('wireframeTitle')}
          description={t('chartPreview')}
          type="bar"
          data={previewData}
          xKey="name"
          series={[
            { key: 'spend', label: tc('spend') },
            { key: 'conversions', label: tc('conversions'), color: 'hsl(var(--chart-2))' },
          ]}
          valueFormatter={(v) => formatCompact(v)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
