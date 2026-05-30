import React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label?: string;
  name: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField - Reusable form field wrapper
 *
 * Wraps form inputs with consistent:
 * - Label with required indicator
 * - Description text
 * - Error state with red border + message
 * - Dark theme styling
 * - Proper ARIA attributes
 */
export function FormField({
  label,
  name,
  error,
  required = false,
  description,
  children,
  className,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const descId = description ? `${name}-description` : undefined;
  const ariaDescribedBy = [descId, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)} role="group" aria-labelledby={`${name}-label`}>
      {/* Label */}
      <label
        id={`${name}-label`}
        htmlFor={name}
        className="flex items-center gap-1 text-[13px] font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
        {required && (
          <span className="text-red-400" aria-hidden="true">
            *
          </span>
        )}
        {required && (
          <span className="sr-only">(required)</span>
        )}
      </label>

      {/* Input wrapper - pass error state to child via cloneElement */}
      <div className="relative">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              id: name,
              'aria-invalid': error ? 'true' : undefined,
              'aria-describedby': ariaDescribedBy,
              'aria-required': required || undefined,
            })
          : children}
      </div>

      {/* Description */}
      {description && (
        <p
          id={descId}
          className="text-[11px] leading-relaxed"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1 text-[11px] font-medium text-red-400 animate-in fade-in slide-in-from-top-1 duration-150"
          role="alert"
        >
          <span className="inline-block h-1 w-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
