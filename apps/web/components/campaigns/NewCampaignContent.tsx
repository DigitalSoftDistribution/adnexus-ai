'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Megaphone } from 'lucide-react';
import Link from 'next/link';

export function NewCampaignContent() {
  const router = useRouter();
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [objective, setObjective] = useState('sales');
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [dailyBudget, setDailyBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const platforms = [
    { value: 'meta', label: t('platforms.meta') },
    { value: 'google', label: t('platforms.google') },
    { value: 'tiktok', label: t('platforms.tiktok') },
    { value: 'snap', label: t('platforms.snap') },
  ];

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

  const createCampaign = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          platform,
          objective,
          status: 'draft',
          budgetType,
          dailyBudget: budgetType === 'daily' ? parseFloat(dailyBudget) || undefined : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(t('failedToCreate'));
      return res.json();
    },
    onSuccess: (data) => {
      router.push(`/dashboard/campaigns/${data.data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/campaigns">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tc('back')}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-8 w-8 text-primary" />
          {t('newCampaign')}
        </h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('campaignDetails')}</CardTitle>
          <CardDescription>{t('basicInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('campaignName')} *</Label>
              <Input
                id="name"
                placeholder={t('campaignNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform">{tc('platform')} *</Label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">{t('objective')} *</Label>
                <select
                  id="objective"
                  value={objective}
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
              <Label>{t('budgetType')}</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="daily"
                    checked={budgetType === 'daily'}
                    onChange={() => setBudgetType('daily')}
                  />
                  <span className="text-sm">{t('dailyBudget')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="lifetime"
                    checked={budgetType === 'lifetime'}
                    onChange={() => setBudgetType('lifetime')}
                  />
                  <span className="text-sm">{t('lifetimeBudget')}</span>
                </label>
              </div>
            </div>

            {budgetType === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="dailyBudget">{t('dailyBudgetLabel')}</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={t('dailyBudgetPlaceholder')}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{tc('startDate')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{tc('endDate')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {createCampaign.isError && (
              <p className="text-sm text-red-600">
                {createCampaign.error instanceof Error ? createCampaign.error.message : t('failedToCreate')}
              </p>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {tc('creating')}
                  </>
                ) : (
                  t('createCampaign')
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/campaigns">{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
