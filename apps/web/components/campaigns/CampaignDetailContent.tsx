'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Pause, Play, BarChart3, Users, Calendar,
  History, Megaphone, TrendingUp, MousePointer, Target,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string | null;
  budgetType: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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

export function CampaignDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const { data: campaign, isLoading } = useCampaign(id);

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
        <p className="text-muted-foreground">Campaign not found</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
    );
  }

  const isActive = campaign.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/campaigns">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{campaign.platform}</Badge>
            <Badge className={isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
              {campaign.status}
            </Badge>
            {campaign.objective && (
              <Badge variant="secondary" className="capitalize">{campaign.objective}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            {isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isActive ? 'Pause' : 'Activate'}
          </Button>
          <Button size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label="Spend"
          value={formatCurrency(campaign.spend)}
          subtext={campaign.budgetType ? `${campaign.budgetType} budget` : 'No budget set'}
        />
        <MetricCard
          icon={Megaphone}
          label="Impressions"
          value={formatNumber(campaign.impressions)}
        />
        <MetricCard
          icon={MousePointer}
          label="Clicks"
          value={formatNumber(campaign.clicks)}
          subtext={campaign.ctr ? `CTR: ${formatPercent(campaign.ctr)}` : undefined}
        />
        <MetricCard
          icon={Target}
          label="Conversions"
          value={formatNumber(campaign.conversions)}
          subtext={campaign.cpa ? `CPA: ${formatCurrency(campaign.cpa)}` : undefined}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="audiences">Audiences</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Campaign performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="ROAS" value={campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'} />
                <MetricRow label="Frequency" value={campaign.frequency?.toFixed(2) ?? '-'} />
                <MetricRow label="CPM" value={campaign.cpm ? formatCurrency(campaign.cpm) : '-'} />
                <MetricRow label="CPC" value={campaign.cpc ? formatCurrency(campaign.cpc) : '-'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Campaign configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="Budget Type" value={campaign.budgetType ?? '-'} />
                <MetricRow
                  label="Daily Budget"
                  value={campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : '-'}
                />
                <MetricRow
                  label="Lifetime Budget"
                  value={campaign.lifetimeBudget ? formatCurrency(campaign.lifetimeBudget) : '-'}
                />
                <MetricRow label="Created" value={formatDate(campaign.createdAt)} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Performance Chart</CardTitle>
              <CardDescription>Spend and conversions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chart placeholder — integrate recharts here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle>Ad Sets & Ads</CardTitle>
              <CardDescription>Manage your ad creatives</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No ads configured yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audiences">
          <Card>
            <CardHeader>
              <CardTitle>Audience Targeting</CardTitle>
              <CardDescription>View and edit audience segments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Audience data will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Schedule</CardTitle>
              <CardDescription>Active dates and delivery schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Start Date"
                value={campaign.startDate ? formatDate(campaign.startDate) : 'Not set'}
              />
              <MetricRow
                label="End Date"
                value={campaign.endDate ? formatDate(campaign.endDate) : 'Not set'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>Audit log of campaign changes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No changes recorded yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
