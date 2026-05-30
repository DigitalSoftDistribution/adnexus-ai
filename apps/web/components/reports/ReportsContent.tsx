'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Plus, FileText, Calendar, Download, TrendingUp, Users, DollarSign } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'performance' | 'financial' | 'audience' | 'creative';
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'performance-summary',
    name: 'Performance Summary',
    description: 'High-level KPIs across all campaigns: spend, impressions, clicks, conversions, ROAS.',
    icon: TrendingUp,
    category: 'performance',
  },
  {
    id: 'campaign-comparison',
    name: 'Campaign Comparison',
    description: 'Side-by-side comparison of up to 5 campaigns with normalized metrics.',
    icon: BarChart3,
    category: 'performance',
  },
  {
    id: 'spend-breakdown',
    name: 'Spend Breakdown',
    description: 'Daily spend tracking with budget pacing and forecast.',
    icon: DollarSign,
    category: 'financial',
  },
  {
    id: 'audience-insights',
    name: 'Audience Insights',
    description: 'Demographics, interests, and behavior analysis of converting audiences.',
    icon: Users,
    category: 'audience',
  },
];

export function ReportsContent() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and schedule performance reports.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Reports" value="0" icon={FileText} />
        <StatCard label="Scheduled" value="0" icon={Calendar} />
        <StatCard label="Generated Today" value="0" icon={BarChart3} />
        <StatCard label="Downloads" value="0" icon={Download} />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {['all', 'performance', 'financial', 'audience', 'creative'].map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="capitalize"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <template.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="outline" className="capitalize text-xs">{template.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wireframe Concept */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Wireframe: Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 rounded bg-muted" />
              <div className="h-8 w-48 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted ml-auto" />
            </div>
            <div className="h-40 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
              Chart Preview Area
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-20 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Concept: Drag-and-drop report builder with chart widgets, date range picker, and export options (PDF, CSV, PNG).
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
