'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | string;
  triggerType: string;
  actionType: string;
  platform: string | null;
}

function useAgentRules() {
  return useQuery({
    queryKey: ['agent', 'rules'],
    queryFn: async (): Promise<AutomationRule[]> => {
      const res = await fetch('/api/v2/agent/rules');
      if (!res.ok) throw new Error('Failed to fetch automation rules');
      const json = await res.json();
      return json.data ?? [];
    },
  });
}

export function AgentRulesContent() {
  const t = useTranslations('aiAgent');
  const tc = useTranslations('common');
  const { data, isLoading, isError, error, refetch } = useAgentRules();
  const rules = data ?? [];

  const columns: DataTableColumn<AutomationRule>[] = [
    { id: 'name', header: tc('name'), accessor: (r) => r.name, sortValue: (r) => r.name },
    {
      id: 'status',
      header: tc('status'),
      accessor: (r) => (
        <Badge variant={r.status === 'active' ? 'success' : 'secondary'} className="capitalize">
          {r.status}
        </Badge>
      ),
      sortValue: (r) => r.status,
    },
    {
      id: 'trigger',
      header: 'Trigger',
      accessor: (r) => <span className="capitalize">{r.triggerType.replace(/_/g, ' ')}</span>,
    },
    {
      id: 'action',
      header: tc('actions'),
      accessor: (r) => <span className="capitalize">{r.actionType.replace(/_/g, ' ')}</span>,
    },
    {
      id: 'platform',
      header: tc('platform'),
      accessor: (r) => (r.platform ? <span className="capitalize">{r.platform}</span> : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title={t('activeRules')}
        description="Automation rules evaluated by the AI operator."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/ai-agent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tc('back')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title={tc('error')}
          description={(error as Error)?.message}
          onRetry={() => refetch()}
          retryLabel={tc('retry')}
        />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-6 w-6" />}
          title="No automation rules yet"
          description="Rules drive when the operator generates recommendations. Configure alerts or add rules via the API."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/alerts">Open alerts</Link>
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} data={rules} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
