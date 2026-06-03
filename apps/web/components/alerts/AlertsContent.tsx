'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Bell, Plus, AlertTriangle, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'paused';
  lastTriggered: string | null;
}

function useAlerts() {
  const t = useTranslations('alerts');
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/v2/alerts');
      if (!res.ok) throw new Error(t('failedToFetch'));
      return res.json();
    },
  });

  const rules: AlertRule[] = data?.data?.alerts ?? [];
  const filtered = filter === 'all'
    ? rules
    : rules.filter((r: AlertRule) => r.severity === filter);

  return { rules: filtered, isLoading, filter, setFilter, total: data?.data?.total ?? 0 };
}

export function AlertsContent() {
  const { rules, isLoading, filter, setFilter, total } = useAlerts();
  const t = useTranslations('alerts');
  const tc = useTranslations('common');

  const alertTypes = [
    { name: t('alertTypes.budget'), icon: DollarSign, color: 'bg-red-100 text-red-700' },
    { name: t('alertTypes.performance'), icon: TrendingDown, color: 'bg-amber-100 text-amber-700' },
    { name: t('alertTypes.audience'), icon: Users, color: 'bg-blue-100 text-blue-700' },
    { name: t('alertTypes.system'), icon: Activity, color: 'bg-green-100 text-green-700' },
  ];

  const severities = ['all', 'critical', 'warning', 'info'] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('newAlertRule')}
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label={t('totalRules')} value={String(total)} icon={Bell} />
            <StatCard label={t('critical')} value={String(rules.filter((r: AlertRule) => r.severity === 'critical').length)} icon={AlertTriangle} />
            <StatCard label={tc('active')} value={String(rules.filter((r: AlertRule) => r.status === 'active').length)} icon={Activity} />
            <StatCard label={tc('pause')} value={String(rules.filter((r: AlertRule) => r.status === 'paused').length)} icon={Bell} />
          </div>

          {/* Alert Type Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {alertTypes.map((type) => (
              <Card key={type.name} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${type.color}`}>
                      <type.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">{t('clickToConfigure')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="flex gap-2">
            {severities.map((s) => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(s)}
                className="capitalize"
              >
                {s === 'all' ? tc('all') : t(s)}
              </Button>
            ))}
          </div>

          {/* Rules List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('alertRules')}</CardTitle>
              <CardDescription>{t('alertRulesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rules.map((rule: AlertRule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        <Badge
                          variant={rule.severity === 'critical' ? 'destructive' : rule.severity === 'warning' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {rule.severity}
                        </Badge>
                        <Badge variant={rule.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {rule.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.condition}</p>
                      {rule.lastTriggered && (
                        <p className="text-xs text-muted-foreground">{t('lastTriggered')}: {rule.lastTriggered}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">{tc('edit')}</Button>
                      <Button variant="outline" size="sm">{tc('test')}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Wireframe Concept */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{t('wireframeTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-8 w-40 rounded bg-muted" />
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="h-8 w-40 rounded bg-muted" />
            </div>
            <div className="h-12 rounded bg-muted flex items-center px-4 text-xs text-muted-foreground">
              {t('ruleBuilderPlaceholder')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('concept')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
