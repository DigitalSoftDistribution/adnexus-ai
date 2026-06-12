'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { AlertTriangle, ImageIcon, Sparkles } from 'lucide-react';

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

function fatigueVariant(status: FatigueStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'critical' || status === 'exhausted') return 'destructive';
  if (status === 'warning') return 'secondary';
  return 'outline';
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
            Spike SB-3230 — reads fatigue scores produced by the detect-fatigue worker pipeline via{' '}
            <code className="text-xs">GET /api/v2/ads</code>.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <Sparkles className="h-3 w-3" />
          Spike scaffold
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
            Sorted by worker-derived <code className="text-xs">fatigueScore</code>. Detail trends via{' '}
            <code className="text-xs">/api/v2/ads/:id/creative-performance</code> (not wired in spike).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active ads in this workspace.</p>
          ) : (
            <ul className="divide-y">
              {ranked.slice(0, 20).map((ad) => (
                <li key={ad.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <Button variant="outline" size="sm" disabled title="Full draft flow tracked in SB-3230">
                      Refresh draft
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/campaigns/${ad.campaignId}`}>Campaign</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
