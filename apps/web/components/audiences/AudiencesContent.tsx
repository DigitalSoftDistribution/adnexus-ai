'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { ChartCard } from '@/components/charts/ChartCard';
import { platformLabel } from '@/lib/platforms';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, Target, Globe, Smartphone, Heart, ShoppingCart } from 'lucide-react';

interface Audience {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: string;
  size?: number;
}

function useAudiences() {
  const t = useTranslations('audiences');
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audiences', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/v2/audiences');
      if (!res.ok) throw new Error(t('failedToFetch'));
      return res.json();
    },
  });

  const audiences: Audience[] = data?.data?.audiences ?? [];
  const filtered = filter === 'all'
    ? audiences
    : audiences.filter((s: Audience) => s.platform === filter);

  return { audiences: filtered, isLoading, isError, refetch, filter, setFilter, total: data?.data?.total ?? 0 };
}

export function AudiencesContent() {
  const { audiences, isLoading, isError, refetch, filter, setFilter, total } = useAudiences();
  const t = useTranslations('audiences');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [audienceType, setAudienceType] = useState('');

  const createAudience = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          name,
          type: audienceType,
          size: 0,
          targeting: {},
        }),
      });
      if (!res.ok) throw new Error('Failed to create audience');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      setDialogOpen(false);
      setName('');
      setPlatform('');
      setAudienceType('');
    },
  });

  const platforms = ['all', 'meta', 'google', 'tiktok', 'snap'] as const;

  const platformBreakdown = Object.entries(
    audiences.reduce<Record<string, number>>((acc, a) => {
      acc[a.platform] = (acc[a.platform] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([platform, count]) => ({ name: platformLabel(platform), value: count }));

  const interestCategories = [
    { name: t('interestCategories.technology'), icon: Smartphone, count: 45 },
    { name: t('interestCategories.fashion'), icon: Heart, count: 32 },
    { name: t('interestCategories.travel'), icon: Globe, count: 28 },
    { name: t('interestCategories.ecommerce'), icon: ShoppingCart, count: 56 },
  ];

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newAudience')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audience-name">{tc('name')}</Label>
              <Input id="audience-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('audienceNamePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience-platform">{tc('platform')}</Label>
              <Input id="audience-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="meta" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience-type">{tc('type')}</Label>
              <Input id="audience-type" value={audienceType} onChange={(e) => setAudienceType(e.target.value)} placeholder="lookalike" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createAudience.mutate()}
              disabled={createAudience.isPending || !name || !platform || !audienceType}
            >
              {createAudience.isPending ? tc('creating') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newAudience')}
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title={tc('error')}
          description={t('failedToFetch')}
          onRetry={() => refetch()}
          retryLabel={tc('retry')}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label={t('totalAudiences')} value={String(total)} icon={Users} />
            <StatCard label={tc('active')} value={String(audiences.filter((a: Audience) => a.status === 'active').length)} icon={Target} />
            <StatCard label={t('totalReach')} value={`${(audiences.reduce((sum: number, a: Audience) => sum + (a.size ?? 0), 0) / 1000).toFixed(1)}K`} icon={Globe} />
            <StatCard label={t('platforms')} value={String(new Set(audiences.map((a: Audience) => a.platform)).size)} icon={Smartphone} />
          </div>

          {/* Platform Filter */}
          <div className="flex gap-2">
            {platforms.map((p) => (
              <Button
                key={p}
                variant={filter === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(p)}
                className="capitalize"
              >
                {p === 'all' ? tc('all') : p}
              </Button>
            ))}
          </div>

          {/* Segments List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('audienceSegments')}</CardTitle>
              <CardDescription>{t('audienceSegmentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {audiences.map((segment: Audience) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{segment.name}</span>
                        <Badge variant="outline" className="capitalize text-xs">{segment.platform}</Badge>
                        <Badge variant={segment.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {segment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {segment.size ? `${(segment.size / 1000).toFixed(1)}K` : tc('unknown')} {t('users')} {segment.type}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">{tc('view')}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Interest Categories */}
      <div className="grid gap-4 md:grid-cols-4">
        {interestCategories.map((cat) => (
          <Card key={cat.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <cat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-muted-foreground">{cat.count} {t('interests')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform distribution */}
      {platformBreakdown.length > 0 && (
        <ChartCard
          title={t('wireframeTitle')}
          description={t('platforms')}
          type="donut"
          data={platformBreakdown}
          xKey="name"
          series={[{ key: 'value', label: t('totalAudiences') }]}
          height={260}
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
