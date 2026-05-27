// @ts-nocheck
import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  description?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  /** Show password toggle for password type inputs */
  showPasswordToggle?: boolean;
  register?: any;
}

/**
 * TextInput - Styled text input with icon support, password toggle, and clear button
 *
 * Styled: bg-[#1a1a1a], border-white/10, focus:border-[#c3f53b], rounded-lg
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      error,
      required = false,
      description,
      icon,
      clearable = false,
      showPasswordToggle = true,
      className,
      register,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    // Handle controlled/uncontrolled clear
    const handleClear = () => {
      if (onChange) {
        const event = { target: { name, value: '' } } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    const inputClasses = cn(
      'h-11 w-full rounded-lg border bg-[#1a1a1a] text-sm text-white outline-none transition-all duration-150',
      'placeholder:text-white/25',
      'focus:ring-1 focus:ring-[#c3f53b]/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-white/10 focus:border-[#c3f53b]',
      icon && 'pl-10',
      (isPassword && showPasswordToggle) || (clearable && (value || defaultValue)) ? 'pr-10' : 'pr-4',
      'px-4',
      className
    );

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
          {/* Left icon */}
          {icon && (
            <div
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={name}
            name={name}
            type={inputType}
            placeholder={placeholder}
            className={inputClasses}
            {...registerProps}
            onChange={onChange}
            value={value}
            defaultValue={defaultValue}
            {...props}
          />

          {/* Right side actions */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {clearable && (value || defaultValue) && !isPassword && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full p-0.5 transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
                aria-label="Clear input"
              >
                <X size={14} />
              </button>
            )}

            {/* Password toggle */}
            {isPassword && showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        </div>
      </FormField>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
