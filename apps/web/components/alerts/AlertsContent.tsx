'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, AlertTriangle, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'paused';
  lastTriggered: string | null;
}

const MOCK_RULES: AlertRule[] = [
  {
    id: '1',
    name: 'Spend Over Budget',
    condition: 'Daily spend > 120% of budget',
    severity: 'critical',
    status: 'active',
    lastTriggered: '2 hours ago',
  },
  {
    id: '2',
    name: 'CTR Drop',
    condition: 'CTR drops > 20% vs previous 7 days',
    severity: 'warning',
    status: 'active',
    lastTriggered: '1 day ago',
  },
  {
    id: '3',
    name: 'Low ROAS',
    condition: 'ROAS < 2.0 for 3 consecutive days',
    severity: 'warning',
    status: 'paused',
    lastTriggered: null,
  },
  {
    id: '4',
    name: 'Creative Fatigue',
    condition: 'Frequency > 3.5 and CTR declining',
    severity: 'info',
    status: 'active',
    lastTriggered: '5 hours ago',
  },
];

const ALERT_TYPES = [
  { name: 'Budget', icon: DollarSign, color: 'bg-red-100 text-red-700' },
  { name: 'Performance', icon: TrendingDown, color: 'bg-amber-100 text-amber-700' },
  { name: 'Audience', icon: Users, color: 'bg-blue-100 text-blue-700' },
  { name: 'System', icon: Activity, color: 'bg-green-100 text-green-700' },
];

export function AlertsContent() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? MOCK_RULES
    : MOCK_RULES.filter((r) => r.severity === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Monitor and configure alert rules.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Alert Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Rules" value="3" icon={Bell} />
        <StatCard label="Critical" value="1" icon={AlertTriangle} />
        <StatCard label="Triggered Today" value="2" icon={Activity} />
        <StatCard label="Paused" value="1" icon={Bell} />
      </div>

      {/* Alert Type Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {ALERT_TYPES.map((type) => (
          <Card key={type.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${type.color}`}>
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-muted-foreground">Click to configure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Severity Filter */}
      <div className="flex gap-2">
        {['all', 'critical', 'warning', 'info'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Configured monitoring rules and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((rule) => (
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
                    <p className="text-xs text-muted-foreground">Last triggered: {rule.lastTriggered}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Test</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wireframe Concept */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Wireframe: Alert Rule Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-8 w-40 rounded bg-muted" />
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="h-8 w-40 rounded bg-muted" />
            </div>
            <div className="h-12 rounded bg-muted flex items-center px-4 text-xs text-muted-foreground">
              IF metric X operator threshold THEN notify via [Email | Slack | In-App]
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Concept: Visual rule builder with metric picker, threshold slider, notification channel selector, and cooldown settings.
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
