'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function Progress({ value, max = 100, className, barClassName }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-all duration-300',
          percentage >= 90 && 'bg-red-500',
          percentage >= 75 && percentage < 90 && 'bg-amber-500',
          barClassName,
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
