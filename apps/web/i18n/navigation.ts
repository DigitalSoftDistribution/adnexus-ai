import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation APIs. `Link`, `redirect`, `usePathname`, and
// `useRouter` automatically prepend the active locale to hrefs and strip it
// from the value returned by `usePathname`, so call sites can keep using
// locale-less paths like `/dashboard`.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
