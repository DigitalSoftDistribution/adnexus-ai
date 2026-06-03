'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Bot, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Loader2, XCircle, Play } from 'lucide-react';

interface AgentStatus {
  isRunning: boolean;
  rulesActive: number;
  recommendationsPending: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface Recommendation {
  id: string;
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'schedule';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  campaignId: string;
  campaignName: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

function useAgentStatus() {
  const t = useTranslations('aiAgent');
  return useQuery({
    queryKey: ['agent', 'status'],
    queryFn: async (): Promise<AgentStatus> => {
      const res = await fetch('/api/v1/agent/status');
      if (!res.ok) throw new Error(t('failedToFetchStatus'));
      return res.json();
    },
  });
}

function useRecommendations() {
  const t = useTranslations('aiAgent');
  return useQuery({
    queryKey: ['agent', 'recommendations'],
    queryFn: async (): Promise<Recommendation[]> => {
      const res = await fetch('/api/v1/agent/recommendations');
      if (!res.ok) throw new Error(t('failedToFetchRecommendations'));
      const data = await res.json();
      return data.recommendations ?? [];
    },
  });
}

function useAgentActions() {
  const queryClient = useQueryClient();
  const t = useTranslations('aiAgent');

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/agent/recommendations', { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToGenerate'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
    },
  });

  const apply = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/agent/recommendations/${id}/apply`, { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToApply'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/agent/recommendations/${id}/dismiss`, { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToDismiss'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/agent/toggle', { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToToggle'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
    },
  });

  return { generate, apply, dismiss, toggle };
}

export function AIAgentContent() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const { data: status, isLoading: statusLoading } = useAgentStatus();
  const { data: recommendations, isLoading: recsLoading } = useRecommendations();
  const actions = useAgentActions();
  const t = useTranslations('aiAgent');
  const tc = useTranslations('common');

  const isLoading = statusLoading || recsLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const recs = recommendations ?? [];
  const pendingRecs = recs.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => actions.toggle.mutate()}
            disabled={actions.toggle.isPending}
          >
            {status?.isRunning ? <PauseIcon /> : <Play className="mr-2 h-4 w-4" />}
            {status?.isRunning ? t('pauseAgent') : t('resumeAgent')}
          </Button>
          <Button onClick={() => actions.generate.mutate()} disabled={actions.generate.isPending}>
            {actions.generate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc('analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('generateRecommendations')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Agent Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard
          label={t('agentStatus')}
          value={status?.isRunning ? t('running') : t('paused')}
          icon={status?.isRunning ? CheckCircle : AlertTriangle}
          color={status?.isRunning ? 'text-emerald-600' : 'text-amber-600'}
        />
        <StatusCard
          label={t('activeRules')}
          value={String(status?.rulesActive ?? 0)}
          icon={Sparkles}
          color="text-blue-600"
        />
        <StatusCard
          label={t('pendingRecommendations')}
          value={String(pendingRecs.length)}
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatusCard
          label={t('lastRun')}
          value={status?.lastRunAt ? new Date(status.lastRunAt).toLocaleDateString() : t('never')}
          icon={Bot}
          color="text-muted-foreground"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations">
            {t('recommendations')} ({pendingRecs.length})
          </TabsTrigger>
          <TabsTrigger value="insights">{t('insights')}</TabsTrigger>
          <TabsTrigger value="history">{t('history')}</TabsTrigger>
          <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t('noRecommendations')}
              description={t('recommendationsPlaceholder')}
            />
          ) : (
            recs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={() => actions.apply.mutate(rec.id)}
                onDismiss={() => actions.dismiss.mutate(rec.id)}
                isApplying={actions.apply.isPending}
                isDismissing={actions.dismiss.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <span className="text-2xl font-bold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({
  recommendation: rec,
  onApply,
  onDismiss,
  isApplying,
  isDismissing,
}: {
  recommendation: Recommendation;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
  isDismissing: boolean;
}) {
  const isPending = rec.status === 'pending';
  const t = useTranslations('aiAgent');
  const tc = useTranslations('common');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}>
                {rec.impact} {t('impact')}
              </Badge>
              <Badge variant="outline">{rec.type}</Badge>
              <span className="text-sm text-muted-foreground">{rec.campaignName}</span>
            </div>
            <h3 className="font-semibold">{rec.title}</h3>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{t('confidence')}:</span>
                <span className="text-sm">{rec.confidence}%</span>
              </div>
              {!isPending && (
                <Badge variant={rec.status === 'applied' ? 'default' : 'secondary'} className="capitalize">
                  {rec.status}
                </Badge>
              )}
            </div>
          </div>
          {isPending && (
            <div className="flex gap-2 ml-4">
              <Button size="sm" variant="outline" onClick={onDismiss} disabled={isDismissing}>
                <XCircle className="mr-1 h-3 w-3" />
                {tc('dismiss')}
              </Button>
              <Button size="sm" onClick={onApply} disabled={isApplying}>
                <CheckCircle className="mr-1 h-3 w-3" />
                {isApplying ? tc('applying') : tc('apply')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsTab() {
  const t = useTranslations('aiAgent');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('performanceInsights')}</CardTitle>
        <CardDescription>{t('insightsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InsightItem
          icon={TrendingUp}
          title={t('revenueOpportunity')}
          description={t('revenueOpportunityDesc')}
          type="positive"
        />
        <InsightItem
          icon={AlertTriangle}
          title={t('creativeFatigue')}
          description={t('creativeFatigueDesc')}
          type="warning"
        />
        <InsightItem
          icon={CheckCircle}
          title={t('audienceOptimization')}
          description={t('audienceOptimizationDesc')}
          type="positive"
        />
      </CardContent>
    </Card>
  );
}

function HistoryTab() {
  const t = useTranslations('aiAgent');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('actionHistory')}</CardTitle>
        <CardDescription>{t('historyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={Bot}
          title={t('noActions')}
          description={t('actionsPlaceholder')}
        />
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const t = useTranslations('aiAgent');
  const tc = useTranslations('common');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('aiAgentSettings')}</CardTitle>
        <CardDescription>{t('settingsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingRow
          title={t('autoApply')}
          description={t('autoApplyDesc')}
        />
        <SettingRow
          title={t('notificationPreferences')}
          description={t('notificationPreferencesDesc')}
        />
        <SettingRow
          title={t('analysisFrequency')}
          description={t('analysisFrequencyDesc')}
        />
        <SettingRow
          title={t('excludedCampaigns')}
          description={t('excludedCampaignsDesc')}
        />
      </CardContent>
    </Card>
  );
}

function SettingRow({ title, description }: { title: string; description: string }) {
  const tc = useTranslations('common');
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm">{tc('configure')}</Button>
    </div>
  );
}

function InsightItem({
  icon: Icon,
  title,
  description,
  type,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'negative';
}) {
  const colors = {
    positive: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    negative: 'text-red-600 bg-red-50',
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`rounded-full p-2 ${colors[type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
