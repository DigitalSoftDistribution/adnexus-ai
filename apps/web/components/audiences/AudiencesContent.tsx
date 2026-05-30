'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Target, Globe, Smartphone, Heart, ShoppingCart } from 'lucide-react';

interface AudienceSegment {
  id: string;
  name: string;
  size: string;
  platform: string;
  type: 'saved' | 'lookalike' | 'custom' | 'retargeting';
  status: 'active' | 'draft' | 'archived';
}

const MOCK_SEGMENTS: AudienceSegment[] = [
  { id: '1', name: 'High-Value Customers', size: '12.5K', platform: 'meta', type: 'lookalike', status: 'active' },
  { id: '2', name: 'Website Visitors 30d', size: '45.2K', platform: 'google', type: 'retargeting', status: 'active' },
  { id: '3', name: 'Cart Abandoners', size: '8.1K', platform: 'meta', type: 'custom', status: 'active' },
  { id: '4', name: 'Engaged Users', size: '23.7K', platform: 'tiktok', type: 'saved', status: 'draft' },
];

const INTEREST_CATEGORIES = [
  { name: 'Technology', icon: Smartphone, count: 45 },
  { name: 'Fashion', icon: Heart, count: 32 },
  { name: 'Travel', icon: Globe, count: 28 },
  { name: 'E-commerce', icon: ShoppingCart, count: 56 },
];

export function AudiencesContent() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? MOCK_SEGMENTS
    : MOCK_SEGMENTS.filter((s) => s.platform === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audiences</h1>
          <p className="text-muted-foreground">Manage audience segments and targeting.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Audience
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Audiences" value="4" icon={Users} />
        <StatCard label="Active" value="3" icon={Target} />
        <StatCard label="Total Reach" value="89.5K" icon={Globe} />
        <StatCard label="Platforms" value="3" icon={Smartphone} />
      </div>

      {/* Platform Filter */}
      <div className="flex gap-2">
        {['all', 'meta', 'google', 'tiktok', 'snap'].map((p) => (
          <Button
            key={p}
            variant={filter === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(p)}
            className="capitalize"
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Segments List */}
      <Card>
        <CardHeader>
          <CardTitle>Audience Segments</CardTitle>
          <CardDescription>Your saved and custom audiences across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{segment.name}</span>
                    <Badge variant="outline" className="capitalize text-xs">{segment.platform}</Badge>
                    <Badge variant={segment.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {segment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {segment.size} users · {segment.type}
                  </p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interest Categories */}
      <div className="grid gap-4 md:grid-cols-4">
        {INTEREST_CATEGORIES.map((cat) => (
          <Card key={cat.name} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <cat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-muted-foreground">{cat.count} interests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wireframe Concept */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Wireframe: Audience Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex gap-4">
              <div className="flex-1 h-32 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Demographics (Age, Gender, Location)
              </div>
              <div className="flex-1 h-32 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Interests & Behaviors
              </div>
              <div className="flex-1 h-32 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Custom Data Sources
              </div>
            </div>
            <div className="h-24 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
              Audience Size Estimator & Overlap Analysis
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Concept: Visual audience builder with demographic filters, interest trees, custom event rules, and real-time size estimation.
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
