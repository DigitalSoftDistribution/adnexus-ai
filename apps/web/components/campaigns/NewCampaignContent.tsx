'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Megaphone } from 'lucide-react';
import Link from 'next/link';

const PLATFORMS = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snap', label: 'Snapchat' },
];

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'traffic', label: 'Website Traffic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'leads', label: 'Lead Generation' },
  { value: 'sales', label: 'Sales / Conversions' },
  { value: 'app_promotion', label: 'App Promotion' },
  { value: 'reach', label: 'Reach' },
  { value: 'video_views', label: 'Video Views' },
];

export function NewCampaignContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [objective, setObjective] = useState('sales');
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [dailyBudget, setDailyBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      if (!res.ok) throw new Error('Failed to create campaign');
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
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-8 w-8 text-primary" />
          New Campaign
        </h1>
        <p className="text-muted-foreground">Create a new advertising campaign.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Enter the basic information for your campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Sale 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective *</Label>
                <select
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="daily"
                    checked={budgetType === 'daily'}
                    onChange={() => setBudgetType('daily')}
                  />
                  <span className="text-sm">Daily Budget</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="lifetime"
                    checked={budgetType === 'lifetime'}
                    onChange={() => setBudgetType('lifetime')}
                  />
                  <span className="text-sm">Lifetime Budget</span>
                </label>
              </div>
            </div>

            {budgetType === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="dailyBudget">Daily Budget (USD)</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="50.00"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
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
                {createCampaign.error instanceof Error ? createCampaign.error.message : 'Failed to create campaign'}
              </p>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/campaigns">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
