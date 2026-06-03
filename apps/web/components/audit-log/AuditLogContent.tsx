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
  actorName: string | null;
  action: string;
  actionCategory: string | null;
  entityType: string | null;
  createdAt: string;
}

export function AuditLogContent() {
  const t = useTranslations('auditLog');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
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
    { id: 'actor', header: t('actor'), accessor: (e) => e.actorName ?? tc('system') },
    { id: 'action', header: t('action'), accessor: (e) => <span className="font-mono text-xs">{e.action}</span> },
    {
      id: 'category',
      header: t('category'),
      accessor: (e) =>
        e.actionCategory ? (
          <Badge variant="outline" className="capitalize">{e.actionCategory}</Badge>
        ) : (
          <span className="text-muted-foreground">{tc('unknown')}</span>
        ),
    },
    { id: 'entity', header: t('entity'), accessor: (e) => e.entityType ?? '-' },
    {
      id: 'date',
      header: tc('created'),
      align: 'right',
      accessor: (e) => formatDate(e.createdAt),
      sortValue: (e) => e.createdAt,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<ScrollText className="h-5 w-5" />} title={t('title')} description={t('description')} />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
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
