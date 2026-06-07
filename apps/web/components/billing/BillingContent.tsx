'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { CreditCard, Download, CheckCircle, AlertCircle } from 'lucide-react';

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

function useBillingInfo() {
  const t = useTranslations('billing');
  return useQuery({
    queryKey: ['billing', 'info'],
    queryFn: async (): Promise<BillingInfo> => {
      const res = await fetch('/api/v2/billing');
      if (!res.ok) throw new Error(t('failedToFetchBilling'));
      const data = await res.json();
      return data.data;
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
      return data.data;
    },
  });
}

function useCreatePortalSession() {
  const queryClient = useQueryClient();
  const t = useTranslations('billing');
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToCreatePortal'));
      const data = await res.json();
      return data.data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

export function BillingContent() {
  const { data: billing, isLoading: billingLoading, isError: billingError, refetch: refetchBilling } = useBillingInfo();
  const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError, error: invoicesErrorValue, refetch: refetchInvoices } = useInvoices();
  const portalMutation = useCreatePortalSession();
  const t = useTranslations('billing');
  const tc = useTranslations('common');

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

  return (
    <div className="space-y-6">
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
                ? `${t('currentPeriod')}: ${new Date(billing.currentPeriodStart).toLocaleDateString()} - ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
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
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usageThisPeriod')}</CardTitle>
            <CardDescription>{t('usageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar
              label={t('creatives')}
              used={billing?.credits.creativesUsed ?? 0}
              total={billing?.credits.creativesTotal ?? 0}
            />
            <UsageBar
              label={tc('impressions')}
              used={billing?.credits.impressionsUsed ?? 0}
              total={billing?.credits.impressionsTotal ?? 0}
            />
            <UsageBar
              label={t('aiCredits')}
              used={billing?.credits.aiCreditsUsed ?? 0}
              total={billing?.credits.aiCreditsTotal ?? 0}
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
        <Progress value={used} max={total} />
      )}
    </div>
  );
}
