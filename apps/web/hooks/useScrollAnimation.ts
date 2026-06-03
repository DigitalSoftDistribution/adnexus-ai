'use client';

import { useEffect, useRef, useState } from 'react';

/** Reveal-on-scroll: returns a ref + visibility flag via IntersectionObserver. */
export function useScrollAnimation(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold },
    );

    const current = ref.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, [threshold]);

  return { ref, isVisible };
}
