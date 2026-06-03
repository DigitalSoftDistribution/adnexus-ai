'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plug, CheckCircle2, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { PLATFORMS, type PlatformId } from '@/lib/platforms';

interface IntegrationView {
  platform: PlatformId;
  label: string;
  connected: boolean;
  status: string;
  accountId: string | null;
  accountName: string | null;
  connectUrl: string;
}

function useIntegrations() {
  return useQuery({
    queryKey: ['integrations', 'list'],
    queryFn: async (): Promise<IntegrationView[]> => {
      const res = await fetch('/api/v2/integrations');
      if (!res.ok) throw new Error('Failed to load integrations');
      const json = await res.json();
      return json.data ?? [];
    },
  });
}

export function IntegrationsContent() {
  const { data: integrations, isLoading, isError, error } = useIntegrations();
  const queryClient = useQueryClient();
  const t = useTranslations('integrations');
  const tc = useTranslations('common');

  const disconnect = useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch(`/api/v2/integrations/${platform}/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
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
        <PageHeader icon={<Plug className="h-5 w-5" />} title={t('title')} description={t('description')} />
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-destructive">{tc('error')}</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const items = integrations ?? [];

  return (
    <div className="space-y-6">
      <PageHeader icon={<Plug className="h-5 w-5" />} title={t('title')} description={t('description')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((integration) => {
          const meta = PLATFORMS[integration.platform];
          const color = meta ? `hsl(${meta.colorVar})` : 'hsl(var(--primary))';
          return (
            <Card key={integration.platform} className="transition-colors hover:border-primary/40">
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
                      {tc('active')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t('status.available')}</Badge>
                  )}
                </div>

                {integration.connected && integration.accountName && (
                  <p className="truncate text-sm text-muted-foreground">{integration.accountName}</p>
                )}

                {integration.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => disconnect.mutate(integration.platform)}
                    disabled={disconnect.isPending}
                  >
                    {t('disconnect')}
                  </Button>
                ) : (
                  <Button asChild size="sm" className="w-full">
                    <a href={integration.connectUrl}>
                      <Link2 className="mr-2 h-4 w-4" />
                      {tc('connect')}
                    </a>
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
