'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { AlertTriangle, ChevronDown, ImageIcon, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

type FatigueStatus = 'healthy' | 'warning' | 'critical' | 'exhausted';

interface ExplorerAd {
  id: string;
  name: string;
  campaignId: string;
  creativeType: string | null;
  fatigueScore: number | null;
  fatigueStatus: FatigueStatus;
  ctr: number | null;
  frequency: number | null;
}

interface CreativePerformanceDetail {
  adId: string;
  adName: string;
  creativeType: string | null;
  creativeUrl: string | null;
  fatigue: {
    score: number;
    status: string;
    frequency: number;
    riskLevel: string;
    recommendation: string;
    estimatedDaysToFatigue: number;
  };
  ctrTrend: { current: number; direction: string; estimatedNextWeek: number };
  conversionTrend: { current: number; direction: string; estimatedNextWeek: number };
  overallHealthScore: number;
}

function fatigueVariant(status: FatigueStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'critical' || status === 'exhausted') return 'destructive';
  if (status === 'warning') return 'secondary';
  return 'outline';
}

function TrendDirection({ direction }: { direction: string }) {
  if (direction === 'up' || direction === 'improving') {
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  }
  if (direction === 'down' || direction === 'declining') {
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  }
  return null;
}

export function CreativeExplorerSkeleton() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['creatives', 'explorer', 'ads'],
    queryFn: async () => {
      const res = await fetch('/api/v2/ads?status=active&limit=100');
      if (!res.ok) throw new Error('Failed to load ads');
      const json = await res.json();
      return (json.data?.ads ?? []) as ExplorerAd[];
    },
  });

  const ranked = useMemo(() => {
    return [...(data ?? [])].sort(
      (a, b) => (b.fatigueScore ?? 0) - (a.fatigueScore ?? 0),
    );
  }, [data]);

  const fatigued = ranked.filter(
    (ad) =>
      ad.fatigueStatus === 'warning' ||
      ad.fatigueStatus === 'critical' ||
      ad.fatigueStatus === 'exhausted',
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load creative fatigue data"
        description="Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Creative Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Fatigue scores from the detect-fatigue worker, with per-creative trend detail via{' '}
            <code className="text-xs">GET /api/v2/ads/:id/creative-performance</code>.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="h-3 w-3" />
          Creative intelligence
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active ads</CardDescription>
            <CardTitle className="text-3xl">{ranked.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{fatigued.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg fatigue score</CardDescription>
            <CardTitle className="text-3xl">
              {ranked.length
                ? Math.round(ranked.reduce((s, a) => s + (a.fatigueScore ?? 0), 0) / ranked.length)
                : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fatigue-ranked creatives
          </CardTitle>
          <CardDescription>
            Sorted by worker-derived <code className="text-xs">fatigueScore</code>. Expand a row to
            load CTR/conversion trends and the recommended refresh window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active ads in this workspace.</p>
          ) : (
            <ul className="divide-y">
              {ranked.slice(0, 20).map((ad) => (
                <CreativeRow key={ad.id} ad={ad} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreativeRow({ ad }: { ad: ExplorerAd }) {
  const [expanded, setExpanded] = useState(false);

  const { data: detail, isLoading, isError, refetch } = useQuery({
    queryKey: ['creatives', 'detail', ad.id],
    enabled: expanded,
    queryFn: async (): Promise<CreativePerformanceDetail> => {
      const res = await fetch(`/api/v2/ads/${ad.id}/creative-performance`);
      if (!res.ok) throw new Error('Failed to load creative performance');
      const json = await res.json();
      return json.data as CreativePerformanceDetail;
    },
  });

  return (
    <li className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{ad.name}</p>
            <p className="text-xs text-muted-foreground">
              {ad.creativeType ?? 'unknown'} · CTR {(ad.ctr ?? 0).toFixed(2)}% · freq{' '}
              {(ad.frequency ?? 0).toFixed(1)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={fatigueVariant(ad.fatigueStatus)}>
            {ad.fatigueStatus} · {ad.fatigueScore ?? 0}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={`mr-1 h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            Details
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/campaigns/${ad.campaignId}`}>Campaign</Link>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border bg-muted/30 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" /> Loading creative performance…
            </div>
          ) : isError || !detail ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-destructive">Could not load creative performance.</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailStat
                label="Health score"
                value={`${detail.overallHealthScore}`}
              />
              <DetailStat
                label="Recommended refresh"
                value={`${detail.fatigue.estimatedDaysToFatigue}d`}
                hint={`risk: ${detail.fatigue.riskLevel}`}
              />
              <DetailStat
                label="CTR trend"
                value={`${detail.ctrTrend.current.toFixed(2)}%`}
                hint={`next wk ~${detail.ctrTrend.estimatedNextWeek.toFixed(2)}%`}
                direction={detail.ctrTrend.direction}
              />
              <DetailStat
                label="Conversion trend"
                value={`${detail.conversionTrend.current.toFixed(2)}%`}
                hint={`next wk ~${detail.conversionTrend.estimatedNextWeek.toFixed(2)}%`}
                direction={detail.conversionTrend.direction}
              />
              <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                <span className="font-medium text-foreground">Recommendation: </span>
                {detail.fatigue.recommendation}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DetailStat({
  label,
  value,
  hint,
  direction,
}: {
  label: string;
  value: string;
  hint?: string;
  direction?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1 text-lg font-semibold">
        {value}
        {direction ? <TrendDirection direction={direction} /> : null}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
