// @ts-nocheck
import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubmitButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

export interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: SubmitButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * SubmitButton - Styled submit button with loading spinner and variant support
 *
 * Variants:
 *   primary: bg-[#c3f53b] text-black (default)
 *   secondary: transparent with border
 *   danger: bg-red-600 text-white
 *   outline: bordered, transparent background
 */
export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  (
    {
      children,
      loading = false,
      disabled = false,
      variant = 'primary',
      size = 'md',
      icon,
      fullWidth = true,
      className,
      type = 'submit',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const variantClasses: Record<SubmitButtonVariant, string> = {
      primary:
        'bg-[#c3f53b] text-black font-semibold hover:opacity-90 focus:ring-[#c3f53b]/30',
      secondary:
        'bg-white/5 text-white border border-white/10 hover:bg-white/10 focus:ring-white/10',
      danger:
        'bg-red-600 text-white font-semibold hover:bg-red-700 focus:ring-red-500/30',
      outline:
        'bg-transparent text-white border border-white/20 hover:bg-white/5 hover:border-white/30 focus:ring-white/10',
    };

    const sizeClasses = {
      sm: 'h-9 px-3 text-[13px] rounded-md',
      md: 'h-11 px-4 text-sm rounded-lg',
      lg: 'h-12 px-6 text-base rounded-lg',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span>Processing...</span>
          </>
        ) : (
          <>
            {icon && <span aria-hidden="true">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

SubmitButton.displayName = 'SubmitButton';

export default SubmitButton;
