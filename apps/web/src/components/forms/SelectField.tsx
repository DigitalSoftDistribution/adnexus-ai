import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  register?: any;
}

/**
 * SelectField - Styled select dropdown with custom arrow
 *
 * Styled: dark theme, custom dropdown arrow
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      name,
      options,
      error,
      required = false,
      description,
      placeholder,
      className,
      register,
      ...props
    },
    ref
  ) => {
    const registerProps = register ? register(name) : {};

    return (
      <FormField
        label={label}
        name={name}
        error={error}
        required={required}
        description={description}
      >
        <div className="relative">
          <select
            ref={ref}
            id={name}
            name={name}
            className={cn(
              'h-11 w-full appearance-none rounded-lg border bg-[#1a1a1a] px-4 pr-10 text-sm text-white outline-none transition-all duration-150',
              'focus:border-[#c3f53b] focus:ring-1 focus:ring-[#c3f53b]/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-white/10',
              className
            )}
            {...registerProps}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </FormField>
    );
  }
);

SelectField.displayName = 'SelectField';

export default SelectField;
