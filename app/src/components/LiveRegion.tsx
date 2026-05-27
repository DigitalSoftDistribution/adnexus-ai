// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useToast } from '../hooks/useToast';

/**
 * LiveRegion — aria-live region for dynamic content announcements
 *
 * - aria-live="polite" region for screen readers
 * - Used by toast system and async operations
 * - Invisible visually but fully accessible to screen readers
 * - Announces toast messages automatically
 */

interface LiveRegionProps {
  /** Manual announcements — these will be spoken by screen readers */
  announcements?: { id: string; message: string; priority?: 'polite' | 'assertive' }[];
}

export default function LiveRegion({ announcements }: LiveRegionProps) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const { toasts } = useToast();
  const announcedRef = useRef<Set<string>>(new Set());

  // Auto-announce new toasts
  useEffect(() => {
    if (!toasts?.length) return;

    toasts.forEach((toast) => {
      if (!announcedRef.current.has(toast.id)) {
        announcedRef.current.add(toast.id);
        const message = toast.description
          ? `${toast.title}: ${toast.description}`
          : toast.title;

        const region = toast.type === 'error' ? assertiveRef.current : politeRef.current;
        if (region) {
          region.textContent = '';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              region.textContent = message;
            });
          });
        }
      }
    });

    // Clean up old toast IDs (keep last 20)
    if (announcedRef.current.size > 50) {
      const ids = Array.from(announcedRef.current);
      announcedRef.current = new Set(ids.slice(-20));
    }
  }, [toasts]);

  // Handle manual announcements
  useEffect(() => {
    if (!announcements?.length) return;

    announcements.forEach((a) => {
      const region = a.priority === 'assertive' ? assertiveRef.current : politeRef.current;
      if (region) {
        region.textContent = '';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            region.textContent = a.message;
          });
        });
      }
    });
  }, [announcements]);

  return (
    <>
      {/* Polite — does not interrupt */}
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
      />
      {/* Assertive — interrupts immediately */}
      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
      />
    </>
  );
}
