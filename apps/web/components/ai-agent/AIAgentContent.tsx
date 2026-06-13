'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { Bot, Sparkles, TrendingUp, AlertTriangle, CheckCircle, XCircle, FileEdit, ShieldCheck, MessageSquare } from 'lucide-react';
import { AgentChatPanel } from './AgentChatPanel';

interface AgentStatus {
  isRunning: boolean;
  rulesActive: number;
  optimizationsToday: number;
  creditsUsed: number;
  creditsTotal: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  campaignId: string | null;
  platform: string;
  estimatedImpact: string;
  confidence: 'high' | 'medium' | 'low' | string;
  priority: number;
  status: 'pending' | 'applied' | 'dismissed';
  reasoning: string;
  createdAt: string;
  expiresAt: string | null;
  appliedDraftId: string | null;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low' | string;
  confidence: number;
  relatedCampaigns: string[];
  createdAt: string;
}

function useAgentStatus() {
  const t = useTranslations('aiAgent');
  return useQuery({
    queryKey: ['agent', 'status'],
    queryFn: async (): Promise<AgentStatus> => {
      const res = await fetch('/api/v2/agent/status');
      if (!res.ok) throw new Error(t('failedToFetchStatus'));
      const json = await res.json();
      return json.data;
    },
  });
}

function useRecommendations() {
  const t = useTranslations('aiAgent');
  return useQuery({
    queryKey: ['agent', 'recommendations'],
    queryFn: async (): Promise<Recommendation[]> => {
      const res = await fetch('/api/v2/agent/recommendations');
      if (!res.ok) throw new Error(t('failedToFetchRecommendations'));
      const data = await res.json();
      return data.data ?? [];
    },
  });
}

function useInsights() {
  const t = useTranslations('aiAgent');
  return useQuery({
    queryKey: ['agent', 'insights'],
    queryFn: async (): Promise<Insight[]> => {
      const res = await fetch('/api/v2/agent/insights');
      if (!res.ok) throw new Error(t('failedToFetchInsights'));
      const data = await res.json();
      return data.data ?? [];
    },
  });
}

function useAgentActions() {
  const queryClient = useQueryClient();
  const t = useTranslations('aiAgent');

  const apply = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v2/agent/recommendations/${id}/apply`, { method: 'POST' });
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
      const res = await fetch(`/api/v2/agent/recommendations/${id}/dismiss`, { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToDismiss'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
    },
  });

  return { apply, dismiss };
}

export function AIAgentContent() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const { data: status, isLoading: statusLoading } = useAgentStatus();
  const { data: recommendations, isLoading: recsLoading } = useRecommendations();
  const actions = useAgentActions();
  const t = useTranslations('aiAgent');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const isGenerating = false; // Backend generates recommendations on fetch

  const triggerGeneration = () => {
    queryClient.invalidateQueries({ queryKey: ['agent', 'recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['agent', 'status'] });
  };

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
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={triggerGeneration} disabled={isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t('generateRecommendations')}
          </Button>
        }
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('guardrailTitle')}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">{t('guardrailDescription')}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/dashboard/drafts">{t('reviewDrafts')}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          label={t('agentStatus')}
          value={status?.isRunning ? t('running') : t('paused')}
          icon={status?.isRunning ? CheckCircle : AlertTriangle}
          color={status?.isRunning ? 'text-success' : 'text-warning'}
        />
        <StatusCard
          label={t('activeRules')}
          value={String(status?.rulesActive ?? 0)}
          icon={Sparkles}
          color="text-primary"
        />
        <StatusCard
          label={t('pendingRecommendations')}
          value={String(pendingRecs.length)}
          icon={TrendingUp}
          color="text-chart-4"
        />
        <StatusCard
          label={t('lastRun')}
          value={status?.lastRunAt ? formatDate(status.lastRunAt, locale) : t('never')}
          icon={Bot}
          color="text-muted-foreground"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations">
            {t('recommendations')} ({pendingRecs.length})
          </TabsTrigger>
          <TabsTrigger value="approvals">{t('approvals')}</TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            {t('chat')}
          </TabsTrigger>
          <TabsTrigger value="insights">{t('insights')}</TabsTrigger>
          <TabsTrigger value="history">{t('history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recs.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title={t('noRecommendations')}
              description={t('recommendationsPlaceholder')}
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild size="sm">
                    <Link href="/dashboard/integrations">{t('connectPlatform')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/goals">{t('defineGoals')}</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/dashboard/ai-agent/rules">{t('reviewRules')}</Link>
                  </Button>
                </div>
              }
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

        <TabsContent value="approvals">
          <ApprovalsTab recommendations={recs} />
        </TabsContent>

        <TabsContent value="chat">
          <AgentChatPanel />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
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

  const confidenceVariant =
    rec.confidence === 'high' ? 'success' : rec.confidence === 'low' ? 'secondary' : 'default';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{rec.type.replace(/_/g, ' ')}</Badge>
              <Badge variant={confidenceVariant} className="capitalize">
                {rec.confidence} {t('confidence')}
              </Badge>
              <Badge variant="secondary" className="capitalize">{rec.platform}</Badge>
              <span className="text-xs text-muted-foreground">{rec.estimatedImpact}</span>
            </div>
            <h3 className="font-semibold">{rec.title}</h3>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
            {rec.reasoning && (
              <p className="text-xs text-muted-foreground/80">{rec.reasoning}</p>
            )}
            {!isPending && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={rec.status === 'applied' ? 'success' : 'secondary'} className="capitalize">
                  {rec.status === 'applied' ? t('draftCreated') : rec.status}
                </Badge>
                {rec.appliedDraftId ? (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                    <Link href="/dashboard/drafts">{t('viewApprovalQueue')}</Link>
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          {isPending && (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={onDismiss} disabled={isDismissing}>
                <XCircle className="mr-1 h-3 w-3" />
                {tc('dismiss')}
              </Button>
              <Button size="sm" onClick={onApply} disabled={isApplying}>
                <FileEdit className="mr-1 h-3 w-3" />
                {isApplying ? tc('applying') : t('draftForApproval')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalsTab({ recommendations }: { recommendations: Recommendation[] }) {
  const t = useTranslations('aiAgent');
  const drafted = recommendations.filter((rec) => rec.status === 'applied');

  if (drafted.length === 0) {
    return (
      <EmptyState
        icon={<FileEdit className="h-6 w-6" />}
        title={t('noDraftApprovals')}
        description={t('noDraftApprovalsDescription')}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/drafts">{t('openApprovals')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {drafted.map((rec) => (
        <Card key={rec.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">{t('draftCreated')}</Badge>
                <Badge variant="outline" className="capitalize">{rec.type.replace(/_/g, ' ')}</Badge>
                <Badge variant="secondary" className="capitalize">{rec.platform}</Badge>
              </div>
              <p className="font-medium">{rec.title}</p>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/dashboard/drafts">{t('reviewDraft')}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InsightsTab() {
  const t = useTranslations('aiAgent');
  const { data: insights, isLoading } = useInsights();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const items = insights ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-6 w-6" />}
        title={t('performanceInsights')}
        description={t('insightsDescription')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((insight, i) => (
        <InsightItem
          key={i}
          title={insight.title}
          description={insight.description}
          impact={insight.impact}
          confidence={insight.confidence}
        />
      ))}
    </div>
  );
}

function HistoryTab() {
  const t = useTranslations('aiAgent');
  const { data: recommendations } = useRecommendations();
  const history = (recommendations ?? []).filter((r) => r.status !== 'pending');

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<Bot className="h-6 w-6" />}
        title={t('noActions')}
        description={t('actionsPlaceholder')}
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((rec) => (
        <div key={rec.id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{rec.title}</p>
            <p className="truncate text-sm text-muted-foreground">{rec.estimatedImpact}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {rec.appliedDraftId ? (
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link href="/dashboard/drafts">{t('reviewDraft')}</Link>
              </Button>
            ) : null}
            <Badge variant={rec.status === 'applied' ? 'success' : 'secondary'} className="capitalize">
              {rec.status === 'applied' ? t('draftCreated') : rec.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightItem({
  title,
  description,
  impact,
  confidence,
}: {
  title: string;
  description: string;
  impact: string;
  confidence: number;
}) {
  const Icon = impact === 'high' ? AlertTriangle : impact === 'low' ? CheckCircle : TrendingUp;
  const tone =
    impact === 'high' ? 'text-warning bg-warning/15' : impact === 'low' ? 'text-success bg-success/15' : 'text-primary bg-primary/10';

  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`rounded-full p-2 ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
