// @ts-nocheck
import React, { useRef, useEffect, useCallback, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  description?: string;
  rows?: number;
  maxLength?: number;
  /** Enable auto-resize as user types */
  autoResize?: boolean;
  /** Show character count */
  showCharacterCount?: boolean;
  register?: any;
}

/**
 * TextAreaField - Styled textarea with auto-resize and character count
 *
 * Features: auto-resize, character count, dark theme
 */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  (
    {
      label,
      name,
      error,
      required = false,
      description,
      rows = 4,
      maxLength,
      autoResize = true,
      showCharacterCount = true,
      className,
      register,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const [currentLength, setCurrentLength] = useState(
      (typeof value === 'string' ? value.length : 0) ||
      (typeof defaultValue === 'string' ? defaultValue.length : 0)
    );

    const registerProps = register ? register(name) : {};

    // Sync forwarded ref with inner ref
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(innerRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          innerRef.current;
      }
    }, [ref]);

    // Auto-resize handler
    const resizeTextarea = useCallback(() => {
      if (autoResize && innerRef.current) {
        innerRef.current.style.height = 'auto';
        innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
      }
    }, [autoResize]);

    useEffect(() => {
      resizeTextarea();
    }, [resizeTextarea]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentLength(e.target.value.length);
      if (autoResize) {
        resizeTextarea();
      }
      if (onChange) {
        onChange(e);
      }
    };

    // Update length when value prop changes
    useEffect(() => {
      if (typeof value === 'string') {
        setCurrentLength(value.length);
      }
    }, [value]);

    return (
      <FormField
        label={label}
        name={name}
        error={error}
        required={required}
        description={description}
      >
        <div className="relative">
          <textarea
            ref={innerRef}
            id={name}
            name={name}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              'w-full rounded-lg border bg-[#1a1a1a] px-4 py-3 text-sm text-white outline-none transition-all duration-150',
              'placeholder:text-white/25',
              'resize-none focus:border-[#c3f53b] focus:ring-1 focus:ring-[#c3f53b]/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-white/10',
              className
            )}
            {...registerProps}
            onChange={handleChange}
            value={value}
            defaultValue={defaultValue}
            {...props}
          />

          {/* Character count */}
          {showCharacterCount && maxLength && (
            <div
              className="mt-1 flex justify-end text-[11px]"
              style={{ color: 'var(--text-tertiary)' }}
              aria-live="polite"
            >
              <span
                className={cn(
                  currentLength >= maxLength && 'text-red-400',
                  currentLength > maxLength * 0.85 && 'text-amber-400'
                )}
              >
                {currentLength}
              </span>
              <span> / {maxLength}</span>
            </div>
          )}

          {/* Simple character count without max */}
          {showCharacterCount && !maxLength && currentLength > 0 && (
            <div
              className="mt-1 flex justify-end text-[11px]"
              style={{ color: 'var(--text-tertiary)' }}
              aria-live="polite"
            >
              {currentLength} characters
            </div>
          )}
        </div>
      </FormField>
    );
  }
);

TextAreaField.displayName = 'TextAreaField';

export default TextAreaField;
