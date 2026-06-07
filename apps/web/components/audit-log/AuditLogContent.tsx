'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatDate } from '@/lib/utils';

interface AuditEntry {
  id: string;
  actor_name?: string | null;
  actorName?: string | null;
  action: string;
  action_category?: string | null;
  actionCategory?: string | null;
  entity_type?: string | null;
  entityType?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface AuditFilters {
  actionCategory: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: AuditFilters = {
  actionCategory: '',
  entityType: '',
  dateFrom: '',
  dateTo: '',
};

export function AuditLogContent() {
  const t = useTranslations('auditLog');
  const tc = useTranslations('common');
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(defaultFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params.toString();
  }, [appliedFilters]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-log', 'list', appliedFilters],
    queryFn: async (): Promise<AuditEntry[]> => {
      const res = await fetch(`/api/v2/audit-log${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) throw new Error(t('failedToLoad'));
      const json = await res.json();
      return json.data?.entries ?? [];
    },
  });

  const entries = data ?? [];
  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  const columns: DataTableColumn<AuditEntry>[] = [
    { id: 'actor', header: t('actor'), accessor: (e) => e.actor_name ?? e.actorName ?? tc('system') },
    { id: 'action', header: t('action'), accessor: (e) => <span className="font-mono text-xs">{e.action}</span> },
    {
      id: 'category',
      header: t('category'),
      accessor: (e) => {
        const category = e.action_category ?? e.actionCategory;
        return category ? (
          <Badge variant="outline" className="capitalize">{category}</Badge>
        ) : (
          <span className="text-muted-foreground">{tc('unknown')}</span>
        );
      },
    },
    { id: 'entity', header: t('entity'), accessor: (e) => e.entity_type ?? e.entityType ?? '-' },
    {
      id: 'date',
      header: tc('created'),
      align: 'right',
      accessor: (e) => formatDate(e.created_at ?? e.createdAt ?? ''),
      sortValue: (e) => e.created_at ?? e.createdAt ?? '',
    },
  ];

  const applyFilters = () => setAppliedFilters(draftFilters);
  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<ScrollText className="h-5 w-5" />} title={t('title')} description={t('description')} />

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="audit-action-category">{t('category')}</Label>
            <Input
              id="audit-action-category"
              placeholder={t('categoryPlaceholder')}
              value={draftFilters.actionCategory}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, actionCategory: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-entity-type">{t('entity')}</Label>
            <Input
              id="audit-entity-type"
              placeholder={t('entityPlaceholder')}
              value={draftFilters.entityType}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, entityType: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-date-from">{tc('startDate')}</Label>
            <Input
              id="audit-date-from"
              type="date"
              value={draftFilters.dateFrom}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-date-to">{tc('endDate')}</Label>
            <Input
              id="audit-date-to"
              type="date"
              value={draftFilters.dateTo}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={applyFilters} disabled={isLoading}>{tc('apply')}</Button>
          <Button variant="outline" onClick={clearFilters} disabled={isLoading || (!hasActiveFilters && !Object.values(draftFilters).some(Boolean))}>
            {t('clearFilters')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          title={tc('error')}
          description={(error as Error)?.message ?? t('failedToLoad')}
          onRetry={() => refetch()}
          retryLabel={tc('retry')}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title={hasActiveFilters ? t('emptyFiltered') : t('empty')}
          description={hasActiveFilters ? t('emptyFilteredDescription') : t('emptyDescription')}
        />
      ) : (
        <DataTable columns={columns} data={entries} rowKey={(e) => e.id} />
      )}
    </div>
  );
}
