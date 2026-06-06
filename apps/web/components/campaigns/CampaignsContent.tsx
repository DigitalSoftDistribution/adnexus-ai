'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { platformLabel } from '@/lib/platforms';
import { Search, Plus, Megaphone } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  startDate: string | null;
  endDate: string | null;
}

function useCampaigns() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['campaigns', 'list', page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);

      const res = await fetch(`/api/v2/campaigns?${params}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  return {
    campaigns: (data?.data?.campaigns ?? []) as Campaign[],
    total: data?.data?.total ?? 0,
    isLoading,
    isError,
    refetch,
    page,
    setPage,
    search,
    setSearch,
  };
}

function statusVariant(status: string): 'success' | 'warning' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'secondary';
}

export function CampaignsContent() {
  const { campaigns, isLoading, isError, refetch, search, setSearch } = useCampaigns();
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');
  const locale = useLocale();

  const columns: DataTableColumn<Campaign>[] = [
    {
      id: 'name',
      header: tc('name'),
      accessor: (c) => (
        <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium hover:underline">
          {c.name}
        </Link>
      ),
      sortValue: (c) => c.name,
    },
    {
      id: 'platform',
      header: tc('platform'),
      accessor: (c) => platformLabel(c.platform),
      sortValue: (c) => c.platform,
    },
    {
      id: 'status',
      header: tc('status'),
      accessor: (c) => (
        <Badge variant={statusVariant(c.status)} className="capitalize">
          {c.status}
        </Badge>
      ),
      sortValue: (c) => c.status,
    },
    {
      id: 'spend',
      header: tc('spend'),
      align: 'right',
      accessor: (c) => formatCurrency(c.spend, 'USD', locale),
      sortValue: (c) => c.spend,
    },
    {
      id: 'impressions',
      header: tc('impressions'),
      align: 'right',
      accessor: (c) => formatNumber(c.impressions, locale),
      sortValue: (c) => c.impressions,
    },
    {
      id: 'clicks',
      header: tc('clicks'),
      align: 'right',
      accessor: (c) => formatNumber(c.clicks, locale),
      sortValue: (c) => c.clicks,
    },
    {
      id: 'ctr',
      header: tc('ctr'),
      align: 'right',
      accessor: (c) => (c.ctr ? `${(c.ctr * 100).toFixed(2)}%` : '-'),
      sortValue: (c) => c.ctr ?? 0,
    },
    {
      id: 'period',
      header: tc('period'),
      accessor: (c) => (c.startDate ? formatDate(c.startDate, locale) : '-'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild>
            <Link href="/dashboard/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('newCampaign')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
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
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-6 w-6" />}
              title={t('title')}
              description={t('description')}
              action={
                <Button asChild size="sm">
                  <Link href="/dashboard/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('newCampaign')}
                  </Link>
                </Button>
              }
            />
          ) : (
            <DataTable columns={columns} data={campaigns} rowKey={(c) => c.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
