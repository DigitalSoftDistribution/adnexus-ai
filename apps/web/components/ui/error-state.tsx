import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Optional retry handler — renders a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Centered error placeholder for a failed data load. Use instead of letting a
 * failed query fall through to an empty list, which hides the failure from the
 * user.
 */
export function ErrorState({ title, description, onRetry, retryLabel, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-destructive">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel ?? 'Retry'}
        </Button>
      ) : null}
    </div>
  );
}
