import { useCallback, useEffect, useRef } from 'react';

/**
 * Accessibility hook providing:
 * - focusTrap(ref)        — traps focus inside modals/drawers
 * - announce(message)     — screen reader announcements
 * - skipToContent()       — skip link functionality
 * - reducedMotion()       — respects prefers-reduced-motion
 */

const LIVE_REGION_ID = 'a11y-live-region';

/* ──────────────────────────────────────────────
   Focus trap for modals / drawers
   ────────────────────────────────────────────── */

export function focusTrap(containerRef: React.RefObject<HTMLElement | null>) {
  const container = containerRef.current;
  if (!container) return () => {};

  const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ');

  const getFocusable = () =>
    Array.from(container!.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
      (el) => !el.hasAttribute('disabled') && !(el as HTMLElement).hidden
    ) as HTMLElement[];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Auto-focus first focusable element
  const focusable = getFocusable();
  if (focusable.length > 0) {
    focusable[0].focus();
  }

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/* ──────────────────────────────────────────────
   Screen reader announcement
   ────────────────────────────────────────────── */

type AnnouncePriority = 'polite' | 'assertive';

export function announce(message: string, priority: AnnouncePriority = 'polite') {
  let region = document.getElementById(LIVE_REGION_ID);

  if (!region) {
    region = document.createElement('div');
    region.id = LIVE_REGION_ID;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.padding = '0';
    region.style.margin = '-1px';
    region.style.overflow = 'hidden';
    region.style.clipPath = 'inset(50%)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    document.body.appendChild(region);
  }

  // Clear then set to ensure announcement fires
  region.textContent = '';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      region!.textContent = message;
    });
  });
}

/* ──────────────────────────────────────────────
   Skip to main content
   ────────────────────────────────────────────── */

export function skipToContent(targetId: string = 'main-content') {
  const target = document.getElementById(targetId);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Remove tabindex after focus so it's not in normal tab order
    setTimeout(() => {
      target.removeAttribute('tabindex');
    }, 1000);
  }
}

/* ──────────────────────────────────────────────
   Prefers reduced motion
   ────────────────────────────────────────────── */

const motionQuery = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

let reducedMotionValue = motionQuery?.matches ?? false;

if (motionQuery) {
  motionQuery.addEventListener('change', (e) => {
    reducedMotionValue = e.matches;
  });
}

export function reducedMotion(): boolean {
  return reducedMotionValue;
}

/* ──────────────────────────────────────────────
   Combined hook for convenience
   ────────────────────────────────────────────── */

export function useA11y() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const trapFocus = useCallback(
    (containerRef: React.RefObject<HTMLElement | null>) => {
      // Clean up previous trap
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = focusTrap(containerRef);
      return cleanupRef.current;
    },
    []
  );

  const releaseFocus = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  // Announce with auto-cleanup
  const announceMessage = useCallback(
    (message: string, priority: AnnouncePriority = 'polite') => {
      announce(message, priority);
    },
    []
  );

  const skip = useCallback(() => {
    skipToContent('main-content');
  }, []);

  const prefersReducedMotion = useCallback(() => {
    return reducedMotion();
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    focusTrap: trapFocus,
    releaseFocus,
    announce: announceMessage,
    skipToContent: skip,
    reducedMotion: prefersReducedMotion,
  };
}

export default useA11y;
