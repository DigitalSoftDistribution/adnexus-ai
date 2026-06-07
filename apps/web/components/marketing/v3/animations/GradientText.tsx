'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </span>
  );
}
