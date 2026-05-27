// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormModalProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[900px]',
};

/**
 * FormModal - Reusable modal for forms
 *
 * Features:
 *   - Dark modal with proper padding
 *   - Close button in header
 *   - Backdrop click to close
 *   - Framer Motion animations
 *   - ARIA attributes for accessibility
 */
export function FormModal({
  title,
  description,
  isOpen,
  onClose,
  children,
  footer,
  maxWidth = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className,
}: FormModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          onClick={closeOnBackdropClick ? onClose : undefined}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{
              duration: 0.3,
              ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
            }}
            className={cn(
              'w-full max-h-[85vh] overflow-y-auto rounded-xl',
              maxWidthClasses[maxWidth],
              className
            )}
            style={{
              background: '#1a1a1a',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3">
              <div className="min-w-0 flex-1 pr-4">
                <h3
                  id="form-modal-title"
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </h3>
                {description && (
                  <p
                    className="mt-0.5 text-[11px] leading-relaxed"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close modal"
                  type="button"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="px-5 pb-5">{children}</div>

            {/* Footer */}
            {footer && (
              <div
                className="flex items-center gap-3 border-t px-5 py-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FormModal;
