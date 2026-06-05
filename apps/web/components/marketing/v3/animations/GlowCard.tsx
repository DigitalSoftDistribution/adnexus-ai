'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
