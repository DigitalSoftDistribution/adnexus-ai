'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Smooth-scrolls to the comparison table. Rendered as the hero secondary CTA. */
export function ScrollToTableButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
    >
      See Feature Comparison
    </button>
  );
}

/**
 * Client-side category filter. Receives only plain string category names
 * (no component/function props, so it is safe across the RSC boundary) and
 * toggles the visibility of server-rendered table sections by their
 * `data-category` attribute.
 */
export function CategoryFilter({ categories }: { categories: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const apply = (next: string | null) => {
    setActive(next);
    // The table sections live in the same <section>, after this control.
    const section = containerRef.current?.closest('[data-compare-table]');
    if (!section) return;
    section.querySelectorAll<HTMLElement>('[data-category]').forEach((el) => {
      const cat = el.getAttribute('data-category');
      el.hidden = next !== null && cat !== next;
    });
  };

  return (
    <div ref={containerRef} className="mt-10 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => apply(null)}
        className={cn(
          'rounded-full px-4 py-2 text-sm font-medium transition-colors',
          active === null
            ? 'bg-[#c3f53b]/15 text-[#c3f53b]'
            : 'border border-white/10 text-gray-400 hover:text-white',
        )}
      >
        All
      </button>
      {categories.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => apply(name)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            active === name
              ? 'bg-[#c3f53b]/15 text-[#c3f53b]'
              : 'border border-white/10 text-gray-400 hover:text-white',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
