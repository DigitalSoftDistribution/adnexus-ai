'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { CreditCard, Download, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

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
  return useQuery({
    queryKey: ['billing', 'info'],
    queryFn: async (): Promise<BillingInfo> => {
      const res = await fetch('/api/v2/billing');
      if (!res.ok) throw new Error('Failed to fetch billing info');
      const data = await res.json();
      return data.data;
    },
  });
}

function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async (): Promise<{ invoices: Invoice[]; hasMore: boolean }> => {
      const res = await fetch('/api/v2/billing/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      return data.data;
    },
  });
}

function useCreatePortalSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create portal session');
      const data = await res.json();
      return data.data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['5 creatives', '1,000 impressions', '50 AI credits', 'Basic analytics'],
  starter: ['50 creatives', '50K impressions', '500 AI credits', 'Advanced analytics', 'Email support'],
  growth: ['200 creatives', '500K impressions', '5,000 AI credits', 'Priority support', 'API access'],
  pro: ['1,000 creatives', '2M impressions', '25K AI credits', 'Dedicated support', 'Custom integrations'],
  enterprise: ['Unlimited creatives', 'Unlimited impressions', 'Unlimited AI credits', 'SLA guarantee', 'Custom contracts'],
};

export function BillingContent() {
  const { data: billing, isLoading: billingLoading } = useBillingInfo();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();
  const portalMutation = useCreatePortalSession();

  if (billingLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const plan = billing?.plan || 'free';
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  const isActive = billing?.status === 'active' || billing?.status === 'trialing';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and usage.</p>
        </div>
        {billing?.stripeCustomerId && (
          <Button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
            <CreditCard className="mr-2 h-4 w-4" />
            {portalMutation.isPending ? 'Opening...' : 'Manage Subscription'}
          </Button>
        )}
      </div>

      {/* Plan Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{plan} Plan</CardTitle>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? <CheckCircle className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                {billing?.status || 'inactive'}
              </Badge>
            </div>
            <CardDescription>
              {billing?.currentPeriodStart && billing?.currentPeriodEnd
                ? `Current period: ${new Date(billing.currentPeriodStart).toLocaleDateString()} - ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                : 'No active subscription'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((feature) => (
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
            <CardTitle>Usage This Period</CardTitle>
            <CardDescription>Track your resource consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar
              label="Creatives"
              used={billing?.credits.creativesUsed ?? 0}
              total={billing?.credits.creativesTotal ?? 0}
            />
            <UsageBar
              label="Impressions"
              used={billing?.credits.impressionsUsed ?? 0}
              total={billing?.credits.impressionsTotal ?? 0}
            />
            <UsageBar
              label="AI Credits"
              used={billing?.credits.aiCreditsUsed ?? 0}
              total={billing?.credits.aiCreditsTotal ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
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
                      {invoice.paid ? 'Paid' : 'Unpaid'}
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
              <p>No invoices yet</p>
              <p className="text-sm">Invoices will appear here once you have a paid subscription</p>
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {unlimited ? `${formatNumber(used)} / Unlimited` : `${formatNumber(used)} / ${formatNumber(total)}`}
        </span>
      </div>
            {!unlimited && (
              <Progress value={used} max={total} />
            )}
    </div>
  );
}
