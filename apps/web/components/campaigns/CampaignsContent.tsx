'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
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

  const { data, isLoading } = useQuery({
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

  return { campaigns: data?.data?.campaigns ?? [], total: data?.data?.total ?? 0, isLoading, page, setPage, search, setSearch };
}

export function CampaignsContent() {
  const { campaigns, isLoading, search, setSearch } = useCampaigns();
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('newCampaign')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {tc('filter')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{tc('name')}</th>
                  <th className="px-4 py-3 text-left font-medium">{tc('platform')}</th>
                  <th className="px-4 py-3 text-left font-medium">{tc('status')}</th>
                  <th className="px-4 py-3 text-right font-medium">{tc('spend')}</th>
                  <th className="px-4 py-3 text-right font-medium">{tc('impressions')}</th>
                  <th className="px-4 py-3 text-right font-medium">{tc('clicks')}</th>
                  <th className="px-4 py-3 text-right font-medium">{tc('ctr')}</th>
                  <th className="px-4 py-3 text-left font-medium">{tc('period')}</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign: Campaign) => (
                  <tr key={campaign.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/campaigns/${campaign.id}`} className="hover:underline">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{campaign.platform}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        campaign.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : campaign.status === 'paused'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(campaign.spend)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(campaign.impressions)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(campaign.clicks)}</td>
                    <td className="px-4 py-3 text-right">{campaign.ctr ? `${(campaign.ctr * 100).toFixed(2)}%` : '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {campaign.startDate ? formatDate(campaign.startDate) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
