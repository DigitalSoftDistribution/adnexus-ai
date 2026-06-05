'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate } from '@/lib/utils';
import { FileEdit, CheckCircle, XCircle, RotateCcw, Clock, Play } from 'lucide-react';

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

function useDrafts() {
  return useQuery({
    queryKey: ['drafts', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/v2/drafts');
      if (!res.ok) throw new Error('Failed to fetch drafts');
      return res.json();
    },
  });
}

export function DraftsContent() {
  const { data, isLoading, isError, refetch } = useDrafts();
  const drafts: Draft[] = data?.data?.drafts ?? [];
  const t = useTranslations('drafts');
  const tc = useTranslations('common');

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <ErrorState
          title={tc('error')}
          description={t('failedToFetch')}
          onRetry={() => refetch()}
          retryLabel={tc('retry')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {['pending', 'approved', 'executed', 'failed'].map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{t(`status.${status}`)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {drafts.filter((d) => d.status === status).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentDrafts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileEdit className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('noDrafts')}</p>
                <p className="text-sm">{t('draftsPlaceholder')}</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function useDraftActions() {
  const queryClient = useQueryClient();
  const t = useTranslations('drafts');

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v2/drafts/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToApprove'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/v2/drafts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(t('failedToReject'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
    },
  });

  const execute = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v2/drafts/${id}/execute`, { method: 'POST' });
      if (!res.ok) throw new Error(t('failedToExecute'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts', 'list'] });
    },
  });

  return { approve, reject, execute };
}

function DraftCard({ draft }: { draft: Draft }) {
  const actions = useDraftActions();
  const t = useTranslations('drafts');
  const tc = useTranslations('common');

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: t('status.pending') },
    approved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: t('status.approved') },
    executed: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: t('status.executed') },
    failed: { icon: XCircle, color: 'bg-red-100 text-red-700', label: t('status.failed') },
    rejected: { icon: XCircle, color: 'bg-gray-100 text-gray-700', label: t('status.rejected') },
    rolled_back: { icon: RotateCcw, color: 'bg-purple-100 text-purple-700', label: t('status.rolled_back') },
  };

  const config = statusConfig[draft.status] ?? statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{draft.draftType.replace(/_/g, ' ')}</Badge>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
          {draft.actorType === 'ai' && (
            <Badge variant="secondary" className="text-xs">AI</Badge>
          )}
        </div>
        <p className="font-medium">{draft.changeSummary}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {draft.campaignName && <span>{tc('campaign')}: {draft.campaignName}</span>}
          <span>{tc('by')}: {draft.actorName ?? draft.actorType}</span>
          <span>{formatDate(draft.createdAt)}</span>
        </div>
      </div>
      {draft.status === 'pending' && (
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.reject.mutate({ id: draft.id })}
            disabled={actions.reject.isPending}
          >
            <XCircle className="mr-1 h-3 w-3" />
            {tc('reject')}
          </Button>
          <Button
            size="sm"
            onClick={() => actions.approve.mutate(draft.id)}
            disabled={actions.approve.isPending}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            {tc('approve')}
          </Button>
        </div>
      )}
      {draft.status === 'approved' && (
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.execute.mutate(draft.id)}
            disabled={actions.execute.isPending}
          >
            <Play className="mr-1 h-3 w-3" />
            {actions.execute.isPending ? tc('executing') : tc('execute')}
          </Button>
        </div>
      )}
    </div>
  );
}
