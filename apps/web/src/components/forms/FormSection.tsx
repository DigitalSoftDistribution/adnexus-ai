import React from 'react';
import { cn } from '@/lib/utils';

export interface FormSectionProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * FormSection - Form section divider with title, optional description, and divider line
 *
 * Groups related form fields with a consistent visual separator
 */
export function FormSection({
  title,
  description,
  children,
  className,
  icon,
}: FormSectionProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        {icon && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'rgba(195, 245, 59, 0.1)' }}
          >
            <span style={{ color: '#c3f53b' }}>{icon}</span>
          </div>
        )}

        {/* Title + description */}
        <div className="flex flex-col gap-0.5">
          <h3
            className="text-[13px] font-semibold uppercase tracking-[0.04em]"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {description && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Divider line */}
      <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />

      {/* Section content */}
      {children}
    </div>
  );
}

export default FormSection;
