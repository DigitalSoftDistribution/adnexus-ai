'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Webhook, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'paused';
  lastTriggeredAt: string | null;
}

const EVENT_OPTIONS = ['campaign.created', 'campaign.updated', 'draft.approved', 'alert.triggered'];

export function WebhooksContent() {
  const t = useTranslations('webhooks');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['webhooks', 'configs'],
    queryFn: async (): Promise<WebhookConfig[]> => {
      const res = await fetch('/api/v2/webhooks/config');
      if (!res.ok) throw new Error('Failed to load webhooks');
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/webhooks/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events: EVENT_OPTIONS }),
      });
      if (!res.ok) throw new Error('Failed to create webhook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setOpen(false);
      setName('');
      setUrl('');
    },
  });

  const webhooks = data ?? [];

  const triggerButton = (
    <Button onClick={() => setOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      {t('addWebhook')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addWebhook')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">{tc('name')}</Label>
              <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-url">{t('endpoint')}</Label>
              <Input
                id="wh-url"
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !name || !url}
            >
              {create.isPending ? tc('creating') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        icon={<Webhook className="h-5 w-5" />}
        title={t('title')}
        description={t('description')}
        actions={triggerButton}
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Webhook className="h-6 w-6" />}
          title={tc('error')}
          description={(error as Error)?.message}
        />
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={<Webhook className="h-6 w-6" />}
          title={t('empty')}
          description={t('emptyDescription')}
          action={triggerButton}
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{wh.name}</p>
                    <Badge variant={wh.status === 'active' ? 'success' : 'secondary'}>
                      {wh.status === 'active' ? t('active') : tc('status')}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{wh.url}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {wh.events.slice(0, 3).map((ev) => (
                    <Badge key={ev} variant="outline" className="text-xs">
                      {ev}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
