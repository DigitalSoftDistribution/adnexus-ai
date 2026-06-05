"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Lightbulb,
  MousePointer,
  Radio,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
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

export function DashboardContent() {
  const { data: summary, isLoading, error } = useCampaignSummary();
  const {
    data: integrations,
    isLoading: integrationsLoading,
    error: integrationsError,
  } = useIntegrations();
  const { isConnected } = useSSE();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
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

  // New-workspace zero state: a loaded summary with no campaigns means there is
  // nothing connected/synced yet. Guide the user instead of showing zero KPIs.
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

  // Honest period-over-period delta: latest 7 days vs the prior 7 days. Returns
  // undefined when there isn't enough data, so StatCard hides the badge.
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={connectionBadge}
      />

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
        {chartData.length > 0 ? (
          <ChartCard
            className="lg:col-span-2"
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("avgCtr")}
          value={`${((summary?.avgCtr ?? 0) * 100).toFixed(2)}%`}
        />
        <StatCard
          title={t("avgCpa")}
          value={formatCurrency(summary?.avgCpa ?? 0)}
        />
        <StatCard
          title={t("avgRoas")}
          value={`${(summary?.avgRoas ?? 0).toFixed(2)}x`}
        />
      </div>

      {summary ? (
        <FirstInsightCard summary={summary} integrations={integrations ?? []} />
      ) : null}
    </div>
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
    ? t("lastSynced", {
        date: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(firstConnected.lastSyncedAt)),
      })
    : t("neverSynced");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
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
                  <a href={meta?.connectUrl ?? "/dashboard/integrations"}>
                    {t("connectMetaCta")}
                  </a>
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

function FirstInsightCard({
  summary,
  integrations,
}: {
  summary: CampaignSummary;
  integrations: IntegrationView[];
}) {
  const t = useTranslations("dashboard");
  const lastSynced = integrations
    .filter((i) => i.lastSyncedAt)
    .sort(
      (a, b) =>
        new Date(b.lastSyncedAt ?? 0).getTime() -
        new Date(a.lastSyncedAt ?? 0).getTime(),
    )[0]?.lastSyncedAt;

  const insight = (() => {
    if (summary.totalCampaigns === 0) return t("insightNoCampaigns");
    if (summary.totalSpend === 0) return t("insightNoSpend");
    if (summary.avgRoas > 0)
      return t("insightRoas", { roas: summary.avgRoas.toFixed(2) });
    if (summary.avgCpa > 0)
      return t("insightCpa", { cpa: formatCurrency(summary.avgCpa) });
    return t("insightMonitor");
  })();

  const action =
    summary.avgRoas > 0 && summary.avgRoas < 1.5
      ? t("recommendedActionRoas")
      : summary.avgCtr > 0 && summary.avgCtr < 0.01
        ? t("recommendedActionCtr")
        : t("recommendedActionReview");

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t("firstInsightTitle")}
        </CardTitle>
        <CardDescription>
          {lastSynced
            ? t("dataFreshness", {
                date: new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(lastSynced)),
              })
            : t("dataFreshnessUnknown")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          <p className="text-sm font-medium">{insight}</p>
          <p className="text-sm text-muted-foreground">{action}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/campaigns">
            {t("viewCampaignsCta")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
