'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

interface Goal {
  id: string;
  name: string;
  metric: string;
  targetValue: number;
  status: string;
}

export function GoalsContent() {
  const t = useTranslations('goals');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['goals', 'list'],
    queryFn: async (): Promise<Goal[]> => {
      const res = await fetch('/api/v2/goals');
      if (!res.ok) throw new Error('Failed to load goals');
      const json = await res.json();
      return json.data?.goals ?? [];
    },
  });

  const goals = data ?? [];

  const columns: DataTableColumn<Goal>[] = [
    { id: 'name', header: tc('name'), accessor: (g) => g.name, sortValue: (g) => g.name },
    { id: 'metric', header: t('metric'), accessor: (g) => <span className="uppercase">{g.metric}</span> },
    {
      id: 'target',
      header: t('target'),
      align: 'right',
      accessor: (g) => g.targetValue.toLocaleString(),
      sortValue: (g) => g.targetValue,
    },
    {
      id: 'status',
      header: tc('status'),
      accessor: (g) => (
        <Badge variant={g.status === 'achieved' ? 'success' : g.status === 'missed' ? 'destructive' : 'secondary'} className="capitalize">
          {g.status}
        </Badge>
      ),
      sortValue: (g) => g.status,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<Target className="h-5 w-5" />} title={t('title')} description={t('description')} />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title={t('empty')}
          description={t('emptyDescription')}
        />
      ) : (
        <DataTable columns={columns} data={goals} rowKey={(g) => g.id} />
      )}
    </div>
  );
}
