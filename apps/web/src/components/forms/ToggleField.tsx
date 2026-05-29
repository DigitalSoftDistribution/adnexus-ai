import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleFieldProps {
  label: string;
  name: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  register?: any;
  className?: string;
}

/**
 * ToggleField - Styled toggle switch with lime green active state
 *
 * Styled: custom toggle with #c3f53b active state
 */
export const ToggleField = forwardRef<HTMLInputElement, ToggleFieldProps>(
  (
    {
      label,
      name,
      description,
      checked,
      defaultChecked,
      onChange,
      disabled = false,
      register,
      className,
    },
    ref
  ) => {
    const registerProps = register ? register(name) : {};

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
      registerProps.onChange?.(e);
    };

    const isChecked = checked !== undefined ? checked : undefined;

    return (
      <div
        className={cn(
          'flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 transition-all',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {/* Text content */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <label
            htmlFor={name}
            className="text-[13px] font-medium cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </label>
          {description && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {description}
            </p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isChecked ?? defaultChecked ?? false}
          aria-labelledby={`${name}-label`}
          disabled={disabled}
          onClick={() => {
            const newValue = !(isChecked ?? defaultChecked ?? false);
            onChange?.(newValue);
            // Trigger register's onChange if available
            if (registerProps.onChange) {
              registerProps.onChange({ target: { name, checked: newValue, type: 'checkbox' } });
            }
          }}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            (isChecked ?? defaultChecked ?? false)
              ? 'bg-[#c3f53b]'
              : 'bg-white/20 hover:bg-white/30',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
              (isChecked ?? defaultChecked ?? false) ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>

        {/* Hidden checkbox for form registration */}
        <input
          ref={ref}
          type="checkbox"
          id={name}
          name={name}
          checked={isChecked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...registerProps}
        />
      </div>
    );
  }
);

ToggleField.displayName = 'ToggleField';

export default ToggleField;
