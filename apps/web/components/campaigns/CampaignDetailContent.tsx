'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Pause, Play, BarChart3, Users, Calendar,
  History, Megaphone, TrendingUp, MousePointer, Target, Copy, Trash2, MoreHorizontal,
  Image, AlertTriangle,
} from 'lucide-react';
// Dropdown menu not available - using inline buttons instead
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';

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
  cpm: number | null;
  cpc: number | null;
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

interface AdSet {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  budgetType: string | null;
  bidStrategy: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
}

function useCampaignAdSets(campaignId: string) {
  return useQuery({
    queryKey: ['adsets', 'campaign', campaignId],
    queryFn: async (): Promise<{ adSets: AdSet[]; total: number }> => {
      const res = await fetch(`/api/v2/campaigns/${campaignId}/adsets`);
      if (!res.ok) throw new Error('Failed to fetch ad sets');
      const data = await res.json();
      return data.data;
    },
  });
}

interface HistoryEntry {
  id: string;
  action: string;
  userName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

function useCampaignHistory(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', 'history', campaignId],
    queryFn: async (): Promise<{ history: HistoryEntry[]; total: number }> => {
      const res = await fetch(`/api/v2/campaigns/${campaignId}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      return data.data;
    },
  });
}

interface Ad {
  id: string;
  name: string;
  status: string;
  creativeType: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  fatigueStatus: string;
}

function useCampaignAds(campaignId: string) {
  return useQuery({
    queryKey: ['ads', 'campaign', campaignId],
    queryFn: async (): Promise<{ ads: Ad[]; total: number }> => {
      const res = await fetch(`/api/v2/ads?campaignId=${campaignId}`);
      if (!res.ok) throw new Error('Failed to fetch ads');
      const data = await res.json();
      return data.data;
    },
  });
}

function useCampaignActions(id: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const pause = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v2/campaigns/${id}/pause`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to pause campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'summary'] });
    },
  });

  const activate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v2/campaigns/${id}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'summary'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v2/campaigns/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate campaign');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
      router.push(`/dashboard/campaigns/${data.data.id}`);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v2/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete campaign');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'summary'] });
      router.push('/dashboard/campaigns');
    },
  });

  return { pause, activate, duplicate, delete: deleteCampaign };
}

export function CampaignDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const { data: campaign, isLoading } = useCampaign(id);
  const actions = useCampaignActions(id);

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
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.pause.mutate()}
              disabled={actions.pause.isPending}
            >
              <Pause className="mr-2 h-4 w-4" />
              {actions.pause.isPending ? 'Pausing...' : 'Pause'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.activate.mutate()}
              disabled={actions.activate.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {actions.activate.isPending ? 'Activating...' : 'Activate'}
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/dashboard/campaigns/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.duplicate.mutate()}
            disabled={actions.duplicate.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            {actions.duplicate.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.delete.mutate()}
            disabled={actions.delete.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {actions.delete.isPending ? 'Deleting...' : 'Delete'}
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
          <TabsTrigger value="adsets">Ad Sets</TabsTrigger>
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

        <TabsContent value="adsets">
          <CampaignAdSetsTab campaignId={id} />
        </TabsContent>

        <TabsContent value="ads">
          <CampaignAdsTab campaignId={id} />
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
          <CampaignHistoryTab campaignId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CampaignAdsTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useCampaignAds(campaignId);
  const ads = data?.ads ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Sets & Ads</CardTitle>
          <CardDescription>Manage your ad creatives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Image className="h-12 w-12 mb-4 opacity-50" />
            <p>No ads configured yet</p>
            <p className="text-sm">Ads will appear here once created</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ad Sets & Ads</CardTitle>
          <CardDescription>{ads.length} ad(s) in this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ad.name}</span>
                    <Badge variant="outline" className="capitalize text-xs">{ad.status}</Badge>
                    {ad.creativeType && (
                      <Badge variant="secondary" className="text-xs">{ad.creativeType}</Badge>
                    )}
                    {ad.fatigueStatus !== 'healthy' && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {ad.fatigueStatus}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Spend: {formatCurrency(ad.spend)}</span>
                    <span>Impressions: {formatNumber(ad.impressions)}</span>
                    <span>Clicks: {formatNumber(ad.clicks)}</span>
                    {ad.ctr && <span>CTR: {formatPercent(ad.ctr)}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/ads/${ad.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignAdSetsTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useCampaignAdSets(campaignId);
  const adSets = data?.adSets ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (adSets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Sets</CardTitle>
          <CardDescription>Manage your ad sets</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No ad sets configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ad Sets</CardTitle>
          <CardDescription>{adSets.length} ad set(s) in this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {adSets.map((adSet) => (
              <div
                key={adSet.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{adSet.name}</span>
                    <Badge variant="outline" className="capitalize text-xs">{adSet.status}</Badge>
                    {adSet.bidStrategy && (
                      <Badge variant="secondary" className="text-xs">{adSet.bidStrategy}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Spend: {formatCurrency(adSet.spend)}</span>
                    <span>Impressions: {formatNumber(adSet.impressions)}</span>
                    <span>Clicks: {formatNumber(adSet.clicks)}</span>
                    {adSet.ctr && <span>CTR: {formatPercent(adSet.ctr)}</span>}
                    {adSet.budget && <span>Budget: {formatCurrency(adSet.budget)}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignHistoryTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useCampaignHistory(campaignId);
  const history = data?.history ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>Audit log of campaign changes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change History</CardTitle>
        <CardDescription>{history.length} change(s) recorded</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">by {entry.userName ?? 'System'}</span>
                </div>
                {entry.details && (
                  <p className="text-sm text-muted-foreground">{JSON.stringify(entry.details)}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
