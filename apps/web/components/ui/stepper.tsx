import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  /** Index of the active step. */
  current: number;
  /** Set of completed step ids. */
  completed: Set<string>;
  className?: string;
}

/** Horizontal progress stepper for multi-step flows (onboarding). */
export function Stepper({ steps, current, completed, className }: StepperProps) {
  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((step, i) => {
        const isComplete = completed.has(step.id);
        const isActive = i === current;
        return (
          <React.Fragment key={step.id}>
            <li className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  isComplete
                    ? 'border-success bg-success text-success-foreground'
                    : isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:inline',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', isComplete ? 'bg-success' : 'bg-border')} />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
