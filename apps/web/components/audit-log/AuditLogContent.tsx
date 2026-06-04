'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatDate } from '@/lib/utils';

interface AuditEntry {
  id: string;
  actor_name: string | null;
  action: string;
  action_category: string | null;
  entity_type?: string | null;
  created_at: string;
}

export function AuditLogContent() {
  const t = useTranslations('auditLog');
  const tc = useTranslations('common');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-log', 'list'],
    queryFn: async (): Promise<AuditEntry[]> => {
      const res = await fetch('/api/v2/audit-log');
      if (!res.ok) throw new Error('Failed to load audit log');
      const json = await res.json();
      return json.data?.entries ?? [];
    },
  });

  const entries = data ?? [];

  const columns: DataTableColumn<AuditEntry>[] = [
    { id: 'actor', header: t('actor'), accessor: (e) => e.actor_name ?? tc('system') },
    { id: 'action', header: t('action'), accessor: (e) => <span className="font-mono text-xs">{e.action}</span> },
    {
      id: 'category',
      header: t('category'),
      accessor: (e) =>
        e.action_category ? (
          <Badge variant="outline" className="capitalize">{e.action_category}</Badge>
        ) : (
          <span className="text-muted-foreground">{tc('unknown')}</span>
        ),
    },
    { id: 'entity', header: t('entity'), accessor: (e) => e.entity_type ?? '-' },
    {
      id: 'date',
      header: tc('created'),
      align: 'right',
      accessor: (e) => formatDate(e.created_at),
      sortValue: (e) => e.created_at,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<ScrollText className="h-5 w-5" />} title={t('title')} description={t('description')} />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title={tc('error')}
          description={(error as Error)?.message}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title={t('empty')}
          description={t('emptyDescription')}
        />
      ) : (
        <DataTable columns={columns} data={entries} rowKey={(e) => e.id} />
      )}
    </div>
  );
}
