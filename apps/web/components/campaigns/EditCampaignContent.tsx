'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Save, Megaphone } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string | null;
  budgetType: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startDate: string | null;
  endDate: string | null;
}

function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async (): Promise<Campaign> => {
      const res = await fetch(`/api/v2/campaigns/${id}`);
      if (!res.ok) throw new Error('Failed to fetch campaign');
      const data = await res.json();
      return data.data;
    },
  });
}

export function EditCampaignContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');

  const { data: campaign, isLoading } = useCampaign(id);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const objectives = [
    { value: 'awareness', label: t('objectives.awareness') },
    { value: 'traffic', label: t('objectives.traffic') },
    { value: 'engagement', label: t('objectives.engagement') },
    { value: 'leads', label: t('objectives.leads') },
    { value: 'sales', label: t('objectives.sales') },
    { value: 'app_promotion', label: t('objectives.app_promotion') },
    { value: 'reach', label: t('objectives.reach') },
    { value: 'video_views', label: t('objectives.video_views') },
  ];

  const updateCampaign = useMutation({
    mutationFn: async (updates: Partial<Campaign>) => {
      const res = await fetch(`/api/v2/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(t('failedToUpdate'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
      router.push(`/dashboard/campaigns/${id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCampaign.mutate({
      name,
      objective,
      dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
      startDate: startDate || null,
      endDate: endDate || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('campaignNotFound')}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCampaigns')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/campaigns/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tc('back')}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-8 w-8 text-primary" />
          {t('editCampaign')}
        </h1>
        <p className="text-muted-foreground">{t('editDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('campaignDetails')}</CardTitle>
          <CardDescription>{t('basicInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('campaignName')}</Label>
              <Input
                id="name"
                defaultValue={campaign.name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{tc('platform')}</Label>
                <div className="rounded-md border p-3 text-sm text-muted-foreground capitalize">
                  {campaign.platform}
                  <p className="text-xs mt-1">{t('platformCannotChange')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">{t('objective')}</Label>
                <select
                  id="objective"
                  defaultValue={campaign.objective || 'sales'}
                  onChange={(e) => setObjective(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {objectives.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyBudget">{t('dailyBudgetLabel')}</Label>
              <Input
                id="dailyBudget"
                type="number"
                min="1"
                step="0.01"
                defaultValue={campaign.dailyBudget?.toString() || ''}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{tc('startDate')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  defaultValue={campaign.startDate || ''}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{tc('endDate')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  defaultValue={campaign.endDate || ''}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {updateCampaign.isError && (
              <p className="text-sm text-red-600">
                {updateCampaign.error instanceof Error ? updateCampaign.error.message : tc('error')}
              </p>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={updateCampaign.isPending}>
                {updateCampaign.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {tc('saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('saveChanges')}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/campaigns/${id}`}>{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
