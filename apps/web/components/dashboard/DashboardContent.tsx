"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  FileEdit,
  Lightbulb,
  MousePointer,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/charts/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { formatCurrency, formatCompact } from "@/lib/utils";
import { platformLabel } from "@/lib/platforms";
import { useSSE } from "@/hooks/useSSE";
import { Link } from "@/i18n/navigation";

interface SpendPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface CampaignSummary {
  totalCampaigns: number;
  activeCount: number;
  pausedCount: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
  platformBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  spendSeries: SpendPoint[];
}

interface IntegrationView {
  platform: string;
  label: string;
  connected: boolean;
  status: string;
  id: string | null;
  accountName: string | null;
  lastSyncedAt: string | null;
  connectUrl: string;
}

interface SyncJob {
  id: string;
  status: "running" | "completed" | "partial" | "failed";
  campaignsSynced: number;
  errorCount: number;
  startedAt: string;
  finishedAt: string | null;
}

interface Draft {
  id: string;
  changeSummary: string;
  draftType: string;
  status: string;
  actorType: string;
  actorName: string | null;
  campaignName: string | null;
  createdAt: string;
}

interface AlertRule {
  id: string;
  name: string;
  enabled?: boolean;
  metric?: string;
  operator?: string;
  threshold?: number;
  condition?: string;
  severity?: "critical" | "warning" | "info";
  status?: "active" | "paused";
  lastTriggered: string | null;
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  campaignId: string | null;
  platform: string;
  estimatedImpact: string;
  confidence: "high" | "medium" | "low" | string;
  priority: number;
  status: "pending" | "applied" | "dismissed";
  reasoning: string;
  createdAt: string;
  expiresAt: string | null;
}

interface MorningBriefKpis {
  spend?: { value?: number; change?: number };
  roas?: { value?: number; change?: number };
  conversions?: { value?: number; change?: number };
  cpa?: { value?: number; change?: number };
}

interface MorningBriefNotificationMetadata {
  date?: string;
  workspaceName?: string;
  kpis?: MorningBriefKpis;
  executiveSummary?: string[];
  recommendationCount?: number;
  anomalyCount?: number;
  draftCount?: number;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationList {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const error = (body as { error?: { message?: unknown }; message?: unknown })
      .error;
    if (error && typeof error.message === "string") return error.message;
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function useCampaignSummary() {
  return useQuery({
    queryKey: ["campaigns", "summary"],
    queryFn: async (): Promise<CampaignSummary> => {
      const res = await fetch("/api/v2/campaigns/summary");
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(apiErrorMessage(body, "Failed to fetch summary"));
      return body.data;
    },
  });
}

function useIntegrations() {
  return useQuery({
    queryKey: ["integrations", "list"],
    queryFn: async (): Promise<IntegrationView[]> => {
      const res = await fetch("/api/v2/integrations");
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(apiErrorMessage(body, "Failed to load integrations"));
      return body.data ?? [];
    },
  });
}

function useSyncJobs(accountId: string | null | undefined) {
  return useQuery({
    queryKey: ["sync-jobs", accountId],
    enabled: Boolean(accountId),
    queryFn: async (): Promise<SyncJob[]> => {
      const res = await fetch(
        `/api/v2/integrations/accounts/${accountId}/sync-jobs?limit=1`,
      );
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(apiErrorMessage(body, "Failed to load sync history"));
      return body.data ?? [];
    },
  });
}

function useDrafts() {
  return useQuery({
    queryKey: ["drafts", "list"],
    queryFn: async (): Promise<Draft[]> => {
      const res = await fetch("/api/v2/drafts");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(body, "Failed to fetch drafts"));
      return body.data?.drafts ?? [];
    },
  });
}

function useAlerts() {
  return useQuery({
    queryKey: ["alerts", "list"],
    queryFn: async (): Promise<AlertRule[]> => {
      const res = await fetch("/api/v2/alerts");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(body, "Failed to fetch alerts"));
      return body.data?.alerts ?? [];
    },
  });
}

function useRecommendations() {
  return useQuery({
    queryKey: ["agent", "recommendations"],
    queryFn: async (): Promise<Recommendation[]> => {
      const res = await fetch("/api/v2/agent/recommendations");
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(apiErrorMessage(body, "Failed to fetch recommendations"));
      return body.data ?? [];
    },
  });
}

function useNotifications() {
  return useQuery({
    queryKey: ["notifications", "dashboard"],
    queryFn: async (): Promise<NotificationList> => {
      const res = await fetch("/api/v2/notifications?limit=5");
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(apiErrorMessage(body, "Failed to load notifications"));
      return body.data;
    },
    refetchInterval: 60_000,
  });
}

export function DashboardContent() {
  const { data: summary, isLoading, error } = useCampaignSummary();
  const {
    data: integrations,
    isLoading: integrationsLoading,
    error: integrationsError,
  } = useIntegrations();
  const drafts = useDrafts();
  const alerts = useAlerts();
  const recommendations = useRecommendations();
  const notifications = useNotifications();
  const { isConnected } = useSSE();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="text-destructive text-lg font-medium">
          {t("failedToLoad")}
        </div>
        <p className="text-muted-foreground text-sm">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const connectionBadge = (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        isConnected
          ? "bg-success/15 text-success"
          : "bg-warning/15 text-warning"
      }`}
    >
      <Radio className={`h-3 w-3 ${isConnected ? "animate-pulse" : ""}`} />
      {isConnected ? tc("live") : tc("offline")}
    </div>
  );

  if (summary && summary.totalCampaigns === 0) {
    return (
      <DashboardFirstValueState
        connectionBadge={connectionBadge}
        integrations={integrations ?? []}
        integrationsLoading={integrationsLoading}
        integrationsError={integrationsError as Error | null}
      />
    );
  }

  const series = summary?.spendSeries ?? [];
  const chartData = series.map((p) => ({
    name: p.date.slice(5),
    spend: p.spend,
    clicks: p.clicks,
  }));

  function deltaFor(
    key: "spend" | "impressions" | "clicks" | "conversions",
  ): number | undefined {
    if (series.length < 14) return undefined;
    const recent = series.slice(-7).reduce((s, p) => s + p[key], 0);
    const prior = series.slice(-14, -7).reduce((s, p) => s + p[key], 0);
    if (prior === 0) return undefined;
    return ((recent - prior) / prior) * 100;
  }

  const platformData = Object.entries(summary?.platformBreakdown ?? {}).map(
    ([platform, count]) => ({
      name: platformLabel(platform),
      value: count,
    }),
  );

  const connectedIntegrations = (integrations ?? []).filter((i) => i.connected);
  const pendingDrafts = (drafts.data ?? []).filter((d) => d.status === "pending");
  const activeAlerts = (alerts.data ?? []).filter((a) => a.enabled !== false);
  const criticalAlerts = activeAlerts.filter((a) => alertTone(a) === "destructive");
  const unreadNotifications = (notifications.data?.notifications ?? []).filter(
    (n) => !n.read,
  );
  const latestMorningBrief = (notifications.data?.notifications ?? []).find(
    (n) => n.type === "morning_brief",
  );
  const alertsQueueCount = activeAlerts.length + unreadNotifications.length;
  const pendingRecs = (recommendations.data ?? []).filter(
    (r) => r.status === "pending",
  );
  const lastSynced = connectedIntegrations
    .filter((i) => i.lastSyncedAt)
    .sort(
      (a, b) =>
        new Date(b.lastSyncedAt ?? 0).getTime() -
        new Date(a.lastSyncedAt ?? 0).getTime(),
    )[0]?.lastSyncedAt;
  const staleAccounts = connectedIntegrations.filter((i) => isStale(i.lastSyncedAt));
  const hasAttention =
    pendingDrafts.length > 0 || criticalAlerts.length > 0 || pendingRecs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("commandCenterTitle")}
        description={t("commandCenterDescription")}
        actions={connectionBadge}
      />

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  {t("accountHealthTitle")}
                </CardTitle>
                <CardDescription>{t("accountHealthDescription")}</CardDescription>
              </div>
              <HealthBadge
                connected={connectedIntegrations.length}
                stale={staleAccounts.length}
                alerts={criticalAlerts.length}
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <CommandMetric
              icon={<BarChart3 className="h-4 w-4" />}
              label={t("campaignCoverage")}
              value={`${summary?.activeCount ?? 0}/${summary?.totalCampaigns ?? 0}`}
              detail={t("activePaused", { count: summary?.pausedCount ?? 0 })}
            />
            <CommandMetric
              icon={<Activity className="h-4 w-4" />}
              label={t("connectedAccounts")}
              value={String(connectedIntegrations.length)}
              detail={
                connectedIntegrations.length > 0
                  ? connectedIntegrations.map((i) => i.label).join(", ")
                  : t("noConnectedAccounts")
              }
            />
            <CommandMetric
              icon={<Clock className="h-4 w-4" />}
              label={t("dataFreshnessShort")}
              value={lastSynced ? relativeSyncLabel(lastSynced) : t("unknownFreshness")}
              detail={
                staleAccounts.length > 0
                  ? t("staleAccounts", { count: staleAccounts.length })
                  : t("freshnessLooksGood")
              }
            />
          </CardContent>
        </Card>

        <NextBestActionCard
          hasAttention={hasAttention}
          pendingDrafts={pendingDrafts.length}
          criticalAlerts={criticalAlerts.length}
          pendingRecs={pendingRecs.length}
          staleAccounts={staleAccounts.length}
        />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalSpend")}
          value={formatCurrency(summary?.totalSpend ?? 0)}
          icon={<DollarSign className="h-4 w-4" />}
          delta={deltaFor("spend")}
          deltaLabel={tc("vsPrior7Days")}
          invertDelta
          sparkline={series.map((p) => p.spend)}
        />
        <StatCard
          title={tc("impressions")}
          value={formatCompact(summary?.totalImpressions ?? 0)}
          icon={<Users className="h-4 w-4" />}
          delta={deltaFor("impressions")}
          deltaLabel={tc("vsPrior7Days")}
          sparkline={series.map((p) => p.impressions)}
        />
        <StatCard
          title={tc("clicks")}
          value={formatCompact(summary?.totalClicks ?? 0)}
          icon={<MousePointer className="h-4 w-4" />}
          delta={deltaFor("clicks")}
          deltaLabel={tc("vsPrior7Days")}
          sparkline={series.map((p) => p.clicks)}
        />
        <StatCard
          title={tc("conversions")}
          value={formatCompact(summary?.totalConversions ?? 0)}
          icon={<Target className="h-4 w-4" />}
          delta={deltaFor("conversions")}
          deltaLabel={tc("vsPrior7Days")}
          sparkline={series.map((p) => p.conversions)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <OperationalQueueCard
          title={t("pendingApprovalsTitle")}
          description={t("pendingApprovalsDescription")}
          icon={<FileEdit className="h-5 w-5 text-primary" />}
          count={pendingDrafts.length}
          loading={drafts.isLoading}
          error={drafts.error as Error | null}
          emptyTitle={t("noPendingApprovals")}
          emptyDescription={t("noPendingApprovalsDescription")}
          href="/dashboard/drafts"
          cta={t("reviewDrafts")}
        >
          {pendingDrafts.slice(0, 3).map((draft) => (
            <QueueItem
              key={draft.id}
              title={draft.changeSummary}
              meta={draft.campaignName ?? draft.draftType.replace(/_/g, " ")}
              badge={draft.actorType === "ai" ? "AI" : draft.status}
            />
          ))}
        </OperationalQueueCard>

        <OperationalQueueCard
          title={t("alertsSummaryTitle")}
          description={t("alertsSummaryDescription")}
          icon={<Bell className="h-5 w-5 text-warning" />}
          count={alertsQueueCount}
          loading={alerts.isLoading || notifications.isLoading}
          error={alerts.error as Error | null}
          emptyTitle={t("noActiveAlerts")}
          emptyDescription={t("noActiveAlertsDescription")}
          href="/dashboard/alerts"
          cta={t("manageAlerts")}
        >
          {activeAlerts.slice(0, 2).map((alert) => (
            <QueueItem
              key={alert.id}
              title={alert.name}
              meta={alertDescription(alert)}
              badge={alertBadge(alert)}
              tone={alertTone(alert)}
            />
          ))}
          {unreadNotifications
            .slice(0, Math.max(0, 3 - activeAlerts.slice(0, 2).length))
            .map((n) => (
              <QueueItem
                key={n.id}
                title={n.title}
                meta={n.message}
                badge={n.priority}
                tone={n.priority === "critical" ? "destructive" : "default"}
              />
            ))}
        </OperationalQueueCard>

        <OperationalQueueCard
          title={t("recommendationsTitle")}
          description={t("recommendationsDescription")}
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          count={pendingRecs.length}
          loading={recommendations.isLoading}
          error={recommendations.error as Error | null}
          emptyTitle={t("noRecommendations")}
          emptyDescription={t("noRecommendationsDescription")}
          href="/dashboard/ai-agent"
          cta={t("openAgent")}
        >
          {pendingRecs.slice(0, 3).map((rec) => (
            <QueueItem
              key={rec.id}
              title={rec.title}
              meta={rec.estimatedImpact || rec.description}
              badge={rec.confidence}
            />
          ))}
        </OperationalQueueCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MorningBriefCard notification={latestMorningBrief} />
        <DataFreshnessCard
          integrations={integrations ?? []}
          loading={integrationsLoading}
          error={integrationsError as Error | null}
        />
        {chartData.length > 0 ? (
          <ChartCard
            className="lg:col-span-1"
            title={t("performanceOverview")}
            description={t("performanceDescription")}
            type="area"
            data={chartData}
            xKey="name"
            series={[
              { key: "spend", label: tc("spend") },
              {
                key: "clicks",
                label: tc("clicks"),
                color: "hsl(var(--chart-2))",
              },
            ]}
            valueFormatter={(v) => formatCompact(v)}
          />
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("performanceOverview")}</CardTitle>
              <CardDescription>{t("performanceDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              {tc("noResults")}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {platformData.length > 0 ? (
          <ChartCard
            title={t("platformBreakdown")}
            description={t("platformDescription")}
            type="donut"
            data={platformData}
            xKey="name"
            series={[{ key: "value", label: tc("campaign") }]}
            height={260}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("platformBreakdown")}</CardTitle>
              <CardDescription>{t("platformDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              {tc("noResults")}
            </CardContent>
          </Card>
        )}
        <StatCard title={t("avgCtr")} value={`${((summary?.avgCtr ?? 0) * 100).toFixed(2)}%`} />
        <StatCard title={t("avgRoas")} value={`${(summary?.avgRoas ?? 0).toFixed(2)}x`} />
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
    </div>
  );
}

function HealthBadge({
  connected,
  stale,
  alerts,
}: {
  connected: number;
  stale: number;
  alerts: number;
}) {
  const t = useTranslations("dashboard");
  if (alerts > 0) return <Badge variant="destructive">{t("needsAttention")}</Badge>;
  if (connected === 0 || stale > 0) return <Badge variant="warning">{t("reviewData")}</Badge>;
  return <Badge variant="success">{t("healthy")}</Badge>;
}

function CommandMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function NextBestActionCard({
  hasAttention,
  pendingDrafts,
  criticalAlerts,
  pendingRecs,
  staleAccounts,
}: {
  hasAttention: boolean;
  pendingDrafts: number;
  criticalAlerts: number;
  pendingRecs: number;
  staleAccounts: number;
}) {
  const t = useTranslations("dashboard");
  const action = useMemo(() => {
    if (criticalAlerts > 0) {
      return {
        title: t("nbaCriticalAlertsTitle"),
        description: t("nbaCriticalAlertsDescription", { count: criticalAlerts }),
        href: "/dashboard/alerts" as const,
        cta: t("manageAlerts"),
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      };
    }
    if (pendingDrafts > 0) {
      return {
        title: t("nbaDraftsTitle"),
        description: t("nbaDraftsDescription", { count: pendingDrafts }),
        href: "/dashboard/drafts" as const,
        cta: t("reviewDrafts"),
        icon: <FileEdit className="h-5 w-5 text-primary" />,
      };
    }
    if (pendingRecs > 0) {
      return {
        title: t("nbaRecommendationsTitle"),
        description: t("nbaRecommendationsDescription", { count: pendingRecs }),
        href: "/dashboard/ai-agent" as const,
        cta: t("openAgent"),
        icon: <Sparkles className="h-5 w-5 text-primary" />,
      };
    }
    if (staleAccounts > 0) {
      return {
        title: t("nbaSyncTitle"),
        description: t("nbaSyncDescription", { count: staleAccounts }),
        href: "/dashboard/integrations" as const,
        cta: t("reviewIntegrations"),
        icon: <RefreshCw className="h-5 w-5 text-warning" />,
      };
    }
    return {
      title: t("nbaEmptyTitle"),
      description: t("nbaEmptyDescription"),
      href: "/dashboard/campaigns" as const,
      cta: t("viewCampaignsCta"),
      icon: <Zap className="h-5 w-5 text-success" />,
    };
  }, [criticalAlerts, pendingDrafts, pendingRecs, staleAccounts, t]);

  return (
    <Card className={hasAttention ? "border-primary/20" : "border-success/20"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {action.icon}
          {t("nextBestAction")}
        </CardTitle>
        <CardDescription>{t("nextBestActionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="font-medium">{action.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={action.href}>
            {action.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OperationalQueueCard({
  title,
  description,
  icon,
  count,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  href,
  cta,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  count: number;
  loading: boolean;
  error: Error | null;
  emptyTitle: string;
  emptyDescription: string;
  href: "/dashboard/drafts" | "/dashboard/alerts" | "/dashboard/ai-agent";
  cta: string;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <Card className="min-h-[300px]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : error ? (
          <ErrorState
            title={tc("error")}
            description={error.message}
            retryLabel={tc("retry")}
          />
        ) : count > 0 ? (
          <>
            <div className="space-y-2">{children}</div>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href={href}>{cta}</Link>
            </Button>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <p className="font-medium">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href={href}>{cta}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function alertDescription(alert: AlertRule): string {
  if (alert.condition) return alert.condition;
  const metric = alert.metric?.replace(/_/g, " ") ?? "metric";
  const operator = alert.operator?.replace(/_/g, " ") ?? "changes";
  return `${metric} ${operator} ${alert.threshold ?? "threshold"}`;
}

function alertBadge(alert: AlertRule): string {
  return alert.severity ?? (alert.enabled === false ? "paused" : "active");
}

function alertTone(alert: AlertRule): "default" | "warning" | "destructive" {
  if (alert.severity === "critical") return "destructive";
  if (alert.severity === "warning" || alert.enabled !== false) return "warning";
  return "default";
}

function QueueItem({
  title,
  meta,
  badge,
  tone = "default",
}: {
  title: string;
  meta: string;
  badge: string;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        <Badge
          variant={
            tone === "destructive"
              ? "destructive"
              : tone === "warning"
                ? "warning"
                : "secondary"
          }
          className="shrink-0 capitalize"
        >
          {badge}
        </Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function MorningBriefCard({ notification }: { notification: NotificationItem | undefined }) {
  const t = useTranslations("dashboard");
  const metadata = asMorningBriefMetadata(notification?.metadata);
  const summaryLines = metadata.executiveSummary ?? [];
  const spend = metadata.kpis?.spend?.value;
  const roas = metadata.kpis?.roas?.value;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {t("morningBriefTitle")}
            </CardTitle>
            <CardDescription>{t("morningBriefDescription")}</CardDescription>
          </div>
          {notification ? (
            <Badge variant="teal">{metadata.date ?? formatShortDate(notification.createdAt)}</Badge>
          ) : (
            <Badge variant="outline">{t("morningBriefEmptyBadge")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notification ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <CommandMetric
                icon={<DollarSign className="h-4 w-4" />}
                label={t("morningBriefSpend")}
                value={spend === undefined ? "—" : formatCurrency(spend)}
                detail={t("morningBriefSpendDetail")}
              />
              <CommandMetric
                icon={<Target className="h-4 w-4" />}
                label={t("morningBriefRoas")}
                value={roas === undefined ? "—" : `${roas.toFixed(2)}x`}
                detail={t("morningBriefRoasDetail")}
              />
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              {summaryLines.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {summaryLines.slice(0, 3).map((line, index) => (
                    <li key={`${notification.id}-${index}`} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <BriefCount label={t("morningBriefRecommendations")} value={metadata.recommendationCount ?? 0} />
              <BriefCount label={t("morningBriefAlerts")} value={metadata.anomalyCount ?? 0} />
              <BriefCount label={t("morningBriefDrafts")} value={metadata.draftCount ?? 0} />
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Lightbulb className="h-10 w-10" />}
            title={t("morningBriefEmptyTitle")}
            description={t("morningBriefEmptyDescription")}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/settings">{t("morningBriefSettingsCta")}</Link>
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function BriefCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function asMorningBriefMetadata(metadata: Record<string, unknown> | null | undefined): MorningBriefNotificationMetadata {
  if (!metadata) return {};
  return {
    date: typeof metadata.date === "string" ? metadata.date : undefined,
    workspaceName: typeof metadata.workspaceName === "string" ? metadata.workspaceName : undefined,
    kpis: asMorningBriefKpis(metadata.kpis),
    executiveSummary: Array.isArray(metadata.executiveSummary)
      ? metadata.executiveSummary.filter((item): item is string => typeof item === "string")
      : undefined,
    recommendationCount: asNumber(metadata.recommendationCount),
    anomalyCount: asNumber(metadata.anomalyCount),
    draftCount: asNumber(metadata.draftCount),
  };
}

function asMorningBriefKpis(value: unknown): MorningBriefKpis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  return {
    spend: asKpiValue(source.spend),
    roas: asKpiValue(source.roas),
    conversions: asKpiValue(source.conversions),
    cpa: asKpiValue(source.cpa),
  };
}

function asKpiValue(value: unknown): { value?: number; change?: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  return {
    value: asNumber(source.value),
    change: asNumber(source.change),
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function DataFreshnessCard({
  integrations,
  loading,
  error,
}: {
  integrations: IntegrationView[];
  loading: boolean;
  error: Error | null;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const connected = integrations.filter((i) => i.connected);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          {t("dataFreshnessTitle")}
        </CardTitle>
        <CardDescription>{t("dataFreshnessDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        ) : error ? (
          <ErrorState title={tc("error")} description={error.message} />
        ) : connected.length > 0 ? (
          connected.slice(0, 4).map((integration) => (
            <div
              key={integration.id ?? integration.platform}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {integration.accountName ?? integration.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {integration.lastSyncedAt
                    ? t("lastSynced", { date: formatShortDate(integration.lastSyncedAt) })
                    : t("neverSynced")}
                </p>
              </div>
              <Badge variant={isStale(integration.lastSyncedAt) ? "warning" : "success"}>
                {isStale(integration.lastSyncedAt) ? t("stale") : t("fresh")}
              </Badge>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <p className="font-medium">{t("noConnectedAccounts")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("connectForFreshness")}</p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/dashboard/integrations">{t("reviewIntegrations")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardFirstValueState({
  connectionBadge,
  integrations,
  integrationsLoading,
  integrationsError,
}: {
  connectionBadge: ReactNode;
  integrations: IntegrationView[];
  integrationsLoading: boolean;
  integrationsError: Error | null;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();

  const meta = integrations.find((i) => i.platform === "meta");
  const connected = integrations.filter((i) => i.connected);
  const firstConnected = meta?.connected ? meta : connected[0];
  const { data: syncJobs = [], isLoading: jobsLoading } = useSyncJobs(
    firstConnected?.id,
  );
  const latestJob = syncJobs[0];
  const sync = useMutation({
    mutationFn: async () => {
      if (!firstConnected?.id) throw new Error(t("syncNoConnectedAccount"));
      const res = await fetch(
        `/api/v2/integrations/accounts/${firstConnected.id}/sync`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(body, t("syncFailed")));
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      if (firstConnected?.id)
        queryClient.invalidateQueries({
          queryKey: ["sync-jobs", firstConnected.id],
        });
    },
  });

  let current: "connect" | "sync" | "done" = "connect";
  if (firstConnected) current = "sync";
  if (latestJob?.status === "completed" && latestJob.campaignsSynced > 0)
    current = "done";

  const lastSyncLabel = firstConnected?.lastSyncedAt
    ? t("lastSynced", { date: formatShortDate(firstConnected.lastSyncedAt) })
    : t("neverSynced");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("commandCenterTitle")}
        description={t("commandCenterDescription")}
        actions={connectionBadge}
      />

      {integrationsError ? (
        <ErrorState
          title={t("integrationStatusUnavailable")}
          description={integrationsError.message}
          retryLabel={tc("retry")}
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ["integrations"] })
          }
        />
      ) : null}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("firstValueTitle")}
          </CardTitle>
          <CardDescription>{t("firstValueDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <FirstValueStep
            done={Boolean(firstConnected)}
            active={current === "connect"}
            icon={<BarChart3 className="h-4 w-4" />}
            title={t("connectMetaTitle")}
            description={t("connectMetaDescription")}
            action={
              firstConnected ? (
                <span className="text-sm font-medium text-success">
                  {t("connectedAccount", {
                    account: firstConnected.accountName ?? firstConnected.label,
                  })}
                </span>
              ) : integrationsLoading ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  {tc("loading")}
                </span>
              ) : (
                <Button asChild size="sm">
                  <a href="/dashboard/integrations">{t("connectMetaCta")}</a>
                </Button>
              )
            }
          />
          <FirstValueStep
            done={Boolean(
              latestJob?.status === "completed" &&
                latestJob.campaignsSynced > 0,
            )}
            active={current === "sync"}
            icon={<RefreshCw className="h-4 w-4" />}
            title={t("syncFirstAccountTitle")}
            description={
              firstConnected ? lastSyncLabel : t("syncFirstAccountDescription")
            }
            action={
              firstConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending || jobsLoading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
                  />
                  {sync.isPending ? t("syncing") : t("syncFirstAccountCta")}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("connectRequired")}
                </span>
              )
            }
          />
          <FirstValueStep
            done={false}
            active={current === "done"}
            icon={<Lightbulb className="h-4 w-4" />}
            title={t("viewFirstInsightTitle")}
            description={t("viewFirstInsightDescription")}
            action={
              current === "done" ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard">{t("viewFirstInsightCta")}</Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  {t("viewFirstInsightCta")}
                </Button>
              )
            }
          />
        </CardContent>
      </Card>

      {sync.isError ||
      latestJob?.status === "failed" ||
      latestJob?.status === "partial" ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {latestJob?.status === "partial"
              ? t("partialSyncTitle")
              : t("syncErrorTitle")}
          </AlertTitle>
          <AlertDescription>
            {sync.isError
              ? (sync.error as Error).message
              : latestJob?.status === "partial"
                ? t("partialSyncDescription", {
                    count: latestJob.campaignsSynced,
                  })
                : t("syncErrorDescription")}
          </AlertDescription>
        </Alert>
      ) : null}

      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/integrations">{t("emptyConnect")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/campaigns/new">{t("emptyCreate")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

function FirstValueStep({
  done,
  active,
  icon,
  title,
  description,
  action,
}: {
  done: boolean;
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${active ? "border-primary/50 shadow-sm" : done ? "border-success/40" : ""}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-success/15 text-success" : active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : icon}
        </span>
        <p className="font-medium">{title}</p>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function isStale(date: string | null): boolean {
  if (!date) return true;
  const ageMs = Date.now() - new Date(date).getTime();
  return ageMs > 36 * 60 * 60 * 1000;
}

function relativeSyncLabel(date: string): string {
  const diffHours = Math.max(
    0,
    Math.round((Date.now() - new Date(date).getTime()) / (60 * 60 * 1000)),
  );
  if (diffHours < 1) return "<1h";
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffHours / 24)}d`;
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
