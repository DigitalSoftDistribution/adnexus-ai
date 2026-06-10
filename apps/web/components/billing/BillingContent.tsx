'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { CreditCard, Download, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

interface BillingInfo {
  workspaceId: string;
  name: string;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  credits: {
    creativesUsed: number;
    creativesTotal: number;
    impressionsUsed: number;
    impressionsTotal: number;
    aiCreditsUsed: number;
    aiCreditsTotal: number;
  };
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  subscriptionId: string | null;
  description: string | null;
  paid: boolean;
}

interface BillingPlansResponse {
  billingEnabled: boolean;
  stripeConfigured: boolean;
  plans: Array<{
    plan: string;
    priceId: string;
    credits: { creatives: number; impressions: number; aiCredits: number };
  }>;
  message: string | null;
}

interface BillingUsage {
  workspaceId: string;
  plan: string;
  period: {
    start: string | null;
    end: string | null;
  };
  credits: BillingInfo['credits'];
  detailedBreakdownAvailable: boolean;
}

interface PlanChangeResult {
  previousPlan: string;
  plan: string;
  priceId: string | null;
  subscriptionId: string | null;
  checkoutUrl: string | null;
  effective: 'immediate' | 'period_end';
  cancelAtPeriodEnd?: boolean;
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
  enterprise: 4,
};

function useBillingInfo() {
  const t = useTranslations('billing');
  return useQuery({
    queryKey: ['billing', 'info'],
    queryFn: async (): Promise<BillingInfo> => {
      const res = await fetch('/api/v2/billing');
      if (!res.ok) throw new Error(t('failedToFetchBilling'));
      const data = await res.json();
      return data.data ?? data;
    },
  });
}

function useInvoices() {
  const t = useTranslations('billing');
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async (): Promise<{ invoices: Invoice[]; hasMore: boolean }> => {
      const res = await fetch('/api/v2/billing/invoices');
      if (!res.ok) throw new Error(t('failedToFetchInvoices'));
      const data = await res.json();
      return data.data ?? data;
    },
  });
}

function useBillingUsage() {
  const t = useTranslations('billing');
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async (): Promise<BillingUsage> => {
      const res = await fetch('/api/v2/billing/usage');
      if (!res.ok) throw new Error(t('failedToFetchUsage'));
      const data = await res.json();
      return data.data ?? data;
    },
    retry: false,
  });
}

function useBillingPlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async (): Promise<BillingPlansResponse> => {
      const res = await fetch('/api/v2/billing/plans');
      if (!res.ok) {
        return {
          billingEnabled: false,
          stripeConfigured: false,
          plans: [],
          message: 'Billing checkout is temporarily unavailable.',
        };
      }
      const data = await res.json();
      return data.data ?? data;
    },
  });
}

function useCreatePortalSession() {
  const t = useTranslations('billing');
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToCreatePortal'));
      const data = await res.json();
      return (data.data ?? data) as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

function useUpgradePlan() {
  const t = useTranslations('billing');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: string) => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const res = await fetch('/api/v2/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          successUrl: `${window.location.origin}${currentPath}${currentPath.includes('?') ? '&' : '?'}success=true`,
          cancelUrl: `${window.location.origin}${currentPath}${currentPath.includes('?') ? '&' : '?'}canceled=true`,
        }),
      });
      if (!res.ok) throw new Error(t('failedToUpgrade'));
      const data = await res.json();
      return (data.data ?? data) as PlanChangeResult;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

function useDowngradePlan() {
  const t = useTranslations('billing');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetch('/api/v2/billing/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(t('failedToDowngrade'));
      const data = await res.json();
      return (data.data ?? data) as PlanChangeResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function BillingContent() {
  const { data: billing, isLoading: billingLoading, isError: billingError, refetch: refetchBilling } = useBillingInfo();
  const { data: usage, isError: usageError, refetch: refetchUsage } = useBillingUsage();
  const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError, error: invoicesErrorValue, refetch: refetchInvoices } = useInvoices();
  const { data: billingPlans } = useBillingPlans();
  const portalMutation = useCreatePortalSession();
  const upgradeMutation = useUpgradePlan();
  const downgradeMutation = useDowngradePlan();
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const locale = useLocale();

  if (billingLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (billingError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <ErrorState
          title={tc('error')}
          description={t('failedToFetchBilling')}
          onRetry={() => refetchBilling()}
          retryLabel={tc('retry')}
        />
      </div>
    );
  }

  const plan = billing?.plan || 'free';
  const features = t.raw(`planFeatures.${plan}`) as string[] || t.raw('planFeatures.free') as string[];
  const isActive = billing?.status === 'active' || billing?.status === 'trialing';
  const portalUnavailable = !billing?.stripeCustomerId;
  const currentPlanRank = PLAN_RANK[plan] ?? PLAN_RANK.free;
  const upgradePlan = (billingPlans?.plans ?? [])
    .filter((candidate) => (PLAN_RANK[candidate.plan] ?? -1) > currentPlanRank)
    .sort((a, b) => (PLAN_RANK[a.plan] ?? 0) - (PLAN_RANK[b.plan] ?? 0))[0] ?? null;
  const downgradePlan = (billingPlans?.plans ?? [])
    .filter((candidate) => (PLAN_RANK[candidate.plan] ?? -1) < currentPlanRank)
    .sort((a, b) => (PLAN_RANK[b.plan] ?? 0) - (PLAN_RANK[a.plan] ?? 0))[0] ?? null;
  const canChangePlans = Boolean(billingPlans?.billingEnabled);
  const canUpgrade = canChangePlans && Boolean(upgradePlan);
  const canDowngrade = canChangePlans && Boolean(billing?.stripeSubscriptionId) && (Boolean(downgradePlan) || currentPlanRank > PLAN_RANK.free);
  const usageCredits = usage?.credits ?? billing?.credits;
  const showUsageEndpointDeferral = usageError;
  const showUsageBreakdownDeferral = !usageError && usage?.detailedBreakdownAvailable === false;
  const planChangeNotice = upgradeMutation.isSuccess && upgradeMutation.data && !upgradeMutation.data.checkoutUrl
    ? t('planChangeSuccess', { plan: upgradeMutation.data.plan })
    : downgradeMutation.isSuccess && downgradeMutation.data
      ? downgradeMutation.data.effective === 'period_end'
        ? t('planChangeScheduled', { plan: downgradeMutation.data.plan === billing?.plan ? 'free' : downgradeMutation.data.plan })
        : t('planChangeSuccess', { plan: downgradeMutation.data.plan })
      : null;

  return (
    <div className="space-y-6">
      {billingPlans && !billingPlans.billingEnabled && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex gap-3 pt-6 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-medium">{t('checkoutUnavailable')}</p>
              <p>{billingPlans.message ?? t('checkoutUnavailableDescription')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {canUpgrade && upgradePlan && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex flex-col gap-4 pt-6 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 flex-none" />
              <div>
                <p className="font-medium">{t('checkoutReadyTitle', { plan: upgradePlan.plan })}</p>
                <p>{t('checkoutReadyDescription')}</p>
              </div>
            </div>
            <Button
              onClick={() => upgradeMutation.mutate(upgradePlan.plan)}
              disabled={upgradeMutation.isPending}
              className="shrink-0"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {upgradeMutation.isPending ? t('changingPlan') : t('upgradePlan', { plan: upgradePlan.plan })}
            </Button>
          </CardContent>
        </Card>
      )}

      {planChangeNotice && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex gap-3 pt-6 text-sm text-emerald-950">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-none" />
            <p>{planChangeNotice}</p>
          </CardContent>
        </Card>
      )}

      {upgradeMutation.isError && (
        <ErrorState
          title={tc('error')}
          description={t('failedToUpgrade')}
          retryLabel={tc('retry')}
          onRetry={() => upgradePlan && upgradeMutation.mutate(upgradePlan.plan)}
        />
      )}

      {downgradeMutation.isError && (
        <ErrorState
          title={tc('error')}
          description={t('failedToDowngrade')}
          retryLabel={tc('retry')}
          onRetry={() => {
            if (downgradePlan) {
              downgradeMutation.mutate(downgradePlan.plan);
            } else if (currentPlanRank > PLAN_RANK.free) {
              downgradeMutation.mutate('free');
            }
          }}
        />
      )}

      {portalMutation.isError && (
        <ErrorState
          title={tc('error')}
          description={t('failedToCreatePortal')}
          retryLabel={tc('retry')}
          onRetry={() => portalMutation.mutate()}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending || portalUnavailable}>
            <CreditCard className="mr-2 h-4 w-4" />
            {portalMutation.isPending ? tc('opening') : t('manageSubscription')}
          </Button>
          {portalUnavailable && (
            <p className="max-w-72 text-right text-xs text-muted-foreground">{t('portalUnavailable')}</p>
          )}
        </div>
      </div>

      {portalMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {(portalMutation.error as Error)?.message ?? t('failedToCreatePortal')}
        </div>
      )}

      {/* Plan Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{plan} {t('plan')}</CardTitle>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? <CheckCircle className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                {billing?.status || 'inactive'}
              </Badge>
            </div>
            <CardDescription>
              {billing?.currentPeriodStart && billing?.currentPeriodEnd
                ? `${t('currentPeriod')}: ${new Date(billing.currentPeriodStart).toLocaleDateString(locale)} - ${new Date(billing.currentPeriodEnd).toLocaleDateString(locale)}`
                : t('noActiveSubscription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((feature: string) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            {canDowngrade && (
              <div className="mt-4 flex flex-wrap gap-2">
                {downgradePlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downgradeMutation.isPending}
                    onClick={() => downgradeMutation.mutate(downgradePlan.plan)}
                  >
                    {downgradeMutation.isPending ? t('changingPlan') : t('downgradePlan', { plan: downgradePlan.plan })}
                  </Button>
                )}
                {!downgradePlan && currentPlanRank > PLAN_RANK.free && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downgradeMutation.isPending}
                    onClick={() => downgradeMutation.mutate('free')}
                  >
                    {downgradeMutation.isPending ? t('changingPlan') : t('downgradeToFree')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usageThisPeriod')}</CardTitle>
            <CardDescription>
              {usageError ? t('usageEndpointDeferred') : t('usageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showUsageEndpointDeferral && (
              <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm text-sky-950">
                <Info className="mt-0.5 h-4 w-4 flex-none" />
                <p>{t('usageEndpointDeferredDetail')}</p>
              </div>
            )}
            {showUsageBreakdownDeferral && (
              <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm text-sky-950">
                <Info className="mt-0.5 h-4 w-4 flex-none" />
                <p>{t('usageBreakdownDeferred')}</p>
              </div>
            )}
            {usageError && (
              <Button variant="outline" size="sm" onClick={() => refetchUsage()}>
                {tc('retry')}
              </Button>
            )}
            <UsageBar
              label={t('creatives')}
              used={usageCredits?.creativesUsed ?? 0}
              total={usageCredits?.creativesTotal ?? 0}
            />
            <UsageBar
              label={tc('impressions')}
              used={usageCredits?.impressionsUsed ?? 0}
              total={usageCredits?.impressionsTotal ?? 0}
            />
            <UsageBar
              label={t('aiCredits')}
              used={usageCredits?.aiCreditsUsed ?? 0}
              total={usageCredits?.aiCreditsTotal ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoices')}</CardTitle>
          <CardDescription>{t('invoicesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : invoicesError ? (
            <ErrorState
              title={tc('error')}
              description={(invoicesErrorValue as Error)?.message ?? t('failedToFetchInvoices')}
              onRetry={() => refetchInvoices()}
              retryLabel={tc('retry')}
            />
          ) : invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
            <div className="space-y-2">
              {invoicesData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{invoice.number || invoice.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.periodStart && invoice.periodEnd
                        ? `${new Date(invoice.periodStart * 1000).toLocaleDateString()} - ${new Date(invoice.periodEnd * 1000).toLocaleDateString()}`
                        : new Date(invoice.created * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={invoice.paid ? 'default' : 'destructive'}>
                      {invoice.paid ? t('paid') : t('unpaid')}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(invoice.amountDue / 100, invoice.currency)}
                    </span>
                    {invoice.pdfUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mb-4 opacity-50" />
              <p>{t('noInvoices')}</p>
              <p className="text-sm">{t('invoicesPlaceholder')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageBar({ label, used, total }: { label: string; used: number; total: number }) {
  const unlimited = total === -1;
  const percentage = unlimited ? 0 : total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const tc = useTranslations('common');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {unlimited ? `${formatNumber(used)} / ${tc('unlimited')}` : `${formatNumber(used)} / ${formatNumber(total)}`}
        </span>
      </div>
      {!unlimited && (
        <Progress value={percentage} max={100} />
      )}
    </div>
  );
}
