"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Plug,
  CheckCircle2,
  Link2,
  RefreshCw,
  History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

interface PlatformCapability {
  status: "live" | "read_only" | "mock_ready" | "coming_soon";
  canConnectOAuth: boolean;
  canSyncCampaigns: boolean;
  dashboardReady: boolean;
  mcpReady: boolean;
  mockSyncReady: boolean;
  reason: string;
  remainingWork: string[];
}

interface IntegrationView {
  platform: PlatformId;
  label: string;
  connected: boolean;
  status: string;
  /** Internal ad_accounts.id UUID — used for sync/sync-jobs endpoints. */
  id: string | null;
  accountId: string | null;
  accountName: string | null;
  lastSyncedAt: string | null;
  connectUrl: string;
  capability?: PlatformCapability;
}

interface SyncJob {
  id: string;
  status: "running" | "completed" | "partial" | "failed";
  campaignsSynced: number;
  metricsSynced: number;
  errorCount: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

function useIntegrations() {
  return useQuery({
    queryKey: ["integrations", "list"],
    queryFn: async (): Promise<IntegrationView[]> => {
      const res = await fetch("/api/v2/integrations");
      if (!res.ok) throw new Error("Failed to load integrations");
      const json = await res.json();
      return json.data ?? [];
    },
  });
}

function syncJobStatusVariant(
  status: SyncJob["status"],
): "success" | "warning" | "destructive" | "secondary" {
  if (status === "completed") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "destructive";
  return "secondary";
}

export function IntegrationsContent() {
  const { data: integrations, isLoading, isError, error } = useIntegrations();
  const queryClient = useQueryClient();
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const oauthStatus = searchParams.get("status") ?? searchParams.get("meta");
  const oauthPlatform = searchParams.get("platform") ?? "meta";
  const oauthReason = searchParams.get("reason");
  const isNoAccountsNotice = oauthStatus === "no_accounts";

  async function startOAuthConnect(integration: IntegrationView) {
    const res = await fetch(integration.connectUrl, {
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message ?? "Failed to start OAuth connection");
    const redirectUrl = body?.data?.redirectUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl) {
      throw new Error("OAuth provider URL was not returned");
    }
    window.location.href = redirectUrl;
  }

  const connect = useMutation({
    mutationFn: startOAuthConnect,
  });

  const v1Availability: Record<string, { label: string; disabled: boolean }> = {
    meta: { label: t("availability.metaReady"), disabled: false },
    google: { label: t("availability.readOnly"), disabled: true },
    tiktok: { label: t("availability.mockReady"), disabled: true },
    snap: { label: t("availability.mockReady"), disabled: true },
  };

  const disconnect = useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch(`/api/v2/integrations/${platform}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<Plug className="h-5 w-5" />}
          title={t("title")}
          description={t("description")}
        />
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-destructive">{tc("error")}</p>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message}
          </p>
        </div>
      </div>
    );
  }

  const items = integrations ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Plug className="h-5 w-5" />}
        title={t("title")}
        description={t("description")}
      />

      {oauthStatus && oauthStatus !== "connected" ? (
        <Alert variant={isNoAccountsNotice ? "default" : "destructive"}>
          {isNoAccountsNotice ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{t("oauthIssueTitle")}</AlertTitle>
          <AlertDescription>
            {t("oauthIssueDescription", {
              status: `${oauthPlatform}:${oauthStatus}${oauthReason ? ` (${oauthReason})` : ""}`,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((integration) => {
          const meta = PLATFORMS[integration.platform];
          const color = meta ? `hsl(${meta.colorVar})` : "hsl(var(--primary))";
          const capability = integration.capability;
          const availability = capability
            ? {
                label: t(`availability.${capability.status}`),
                disabled: !capability.canConnectOAuth,
              }
            : v1Availability[integration.platform] ?? { label: t("status.available"), disabled: false };
          return (
            <Card
              key={integration.platform}
              className="transition-colors hover:border-primary/40"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {integration.label.charAt(0)}
                    </span>
                    <div>
                      <p className="font-semibold">{integration.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta?.description ?? integration.platform}
                      </p>
                    </div>
                  </div>
                  {integration.connected ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {tc("active")}
                    </Badge>
                  ) : (
                    <Badge variant={availability.disabled ? "outline" : "secondary"}>{availability.label}</Badge>
                  )}
                </div>

                {integration.connected && integration.accountName && (
                  <p className="truncate text-sm text-muted-foreground">
                    {integration.accountName}
                  </p>
                )}

                {capability && !capability.dashboardReady ? (
                  <p className="text-xs text-muted-foreground">
                    {capability.reason}
                  </p>
                ) : null}

                {capability && capability.remainingWork.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("remainingWork", {
                      items: capability.remainingWork.slice(0, 2).join(", "),
                    })}
                  </p>
                ) : null}

                {!integration.connected &&
                  integration.status !== "not_connected" &&
                  integration.status !== "connected" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t("oauthIssueTitle")}</AlertTitle>
                      <AlertDescription>
                        {t("oauthIssueDescription", {
                          status: integration.status,
                        })}
                      </AlertDescription>
                    </Alert>
                  )}

                {integration.connected ? (
                  <ConnectedActions
                    platform={integration.platform}
                    accountId={integration.id}
                    lastSyncedAt={integration.lastSyncedAt}
                    disconnecting={disconnect.isPending}
                    onDisconnect={() => disconnect.mutate(integration.platform)}
                    locale={locale}
                  />
                ) : availability.disabled ? (
                  <Button size="sm" className="w-full" variant="outline" disabled>
                    <Link2 className="mr-2 h-4 w-4" />
                    {availability.label}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={connect.isPending}
                    onClick={() => connect.mutate(integration)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {tc("connect")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface ConnectedActionsProps {
  platform: string;
  accountId: string | null;
  lastSyncedAt: string | null;
  disconnecting: boolean;
  onDisconnect: () => void;
  locale: string;
}

function ConnectedActions({
  platform,
  accountId,
  lastSyncedAt,
  disconnecting,
  onDisconnect,
  locale,
}: ConnectedActionsProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("integrations");
  const tc = useTranslations("common");

  const sync = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error(t("sync.noAccount"));
      const res = await fetch(
        `/api/v2/integrations/accounts/${accountId}/sync`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(t("sync.failed"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: ["sync-jobs", accountId] });
      }
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => sync.mutate()}
          disabled={sync.isPending || !accountId}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
          />
          {sync.isPending ? t("sync.syncing") : t("sync.syncNow")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          {t("disconnect")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {lastSyncedAt
          ? `${t("sync.lastSynced")}: ${formatDate(lastSyncedAt, locale)}`
          : t("sync.neverSynced")}
      </p>

      {sync.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("sync.failed")}</AlertTitle>
          <AlertDescription>
            {(sync.error as Error)?.message ?? tc("error")}
          </AlertDescription>
        </Alert>
      )}

      {accountId && <SyncJobHistory accountId={accountId} locale={locale} />}
    </div>
  );
}

function SyncJobHistory({ accountId, locale }: { accountId: string; locale: string }) {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");

  const { data, isLoading } = useQuery({
    queryKey: ["sync-jobs", accountId],
    queryFn: async (): Promise<SyncJob[]> => {
      const res = await fetch(
        `/api/v2/integrations/accounts/${accountId}/sync-jobs?limit=3`,
      );
      if (!res.ok) throw new Error("Failed to load sync jobs");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const jobs = data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoadingSpinner size="sm" />
        {tc("loading")}
      </div>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="h-3 w-3" />
        {t("sync.recentSyncs")}
      </p>
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <Badge
            variant={syncJobStatusVariant(job.status)}
            className="capitalize"
          >
            {t(`sync.status.${job.status}`)}
          </Badge>
          <span className="text-muted-foreground">
            {t("sync.campaignsCount", { count: job.campaignsSynced })}
          </span>
          <span className="text-muted-foreground">
            {formatDate(job.startedAt, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}
