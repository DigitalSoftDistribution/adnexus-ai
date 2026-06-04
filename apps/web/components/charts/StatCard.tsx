'use client';

import * as React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  /** Signed percentage change, e.g. 12.5 or -2.1. */
  delta?: number;
  deltaLabel?: string;
  /** Higher-is-better metric? Inverts color logic for cost-style metrics. */
  invertDelta?: boolean;
  sparkline?: number[];
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  delta,
  deltaLabel,
  invertDelta = false,
  sparkline,
  className,
}: StatCardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const positive = hasDelta ? (invertDelta ? delta! < 0 : delta! >= 0) : false;

  return (
    <Card className={cn('overflow-hidden transition-colors hover:border-primary/40', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="font-space text-2xl font-bold tracking-tight">{value}</div>
            {hasDelta ? (
              <p className="mt-1 flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'flex items-center gap-0.5 font-medium',
                    positive ? 'text-success' : 'text-destructive',
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(delta!).toFixed(1)}%
                </span>
                {deltaLabel ? <span className="text-muted-foreground">{deltaLabel}</span> : null}
              </p>
            ) : null}
          </div>
          {sparkline && sparkline.length > 1 ? (
            <div className="h-10 w-24 shrink-0">
              <Sparkline
                data={sparkline}
                color={positive ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
