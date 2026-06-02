# ADR-003: Frontend Framework Decision — Vite SPA

> **⚠️ SUPERSEDED 2026-06-02**
>
> This ADR's decision (**"Vite SPA is canonical / remove Next.js"**) has been **reversed**.
> The team standardized on **Next.js (App Router)** as the product frontend for `apps/web/`.
>
> **Why the reversal:**
> - Deployment is via **Coolify**, whose `Dockerfile` builds the **Next.js standalone output**
>   (`output: 'standalone'` in `next.config.ts`), and `package.json`'s build script is
>   **`next build --webpack`** — not `vite build`. The Vite SPA was never wired into the
>   production deploy path.
> - The Next.js App Router under `apps/web/app/` (with shared code in `apps/web/components/`,
>   `apps/web/lib/`, `apps/web/hooks/`, `apps/web/providers/`) is the actively served product.
> - The Vite SPA (`index.html`, `src/main.tsx`, `src/App.tsx`, `src/spa-pages/**`, `src/views/**`,
>   `src/store(s)/**`, `src/contexts/**`) was dead code and has been **deleted**. A small set of
>   shared primitives under `src/components/{ui,forms}`, `src/components/PageTransition`,
>   `src/hooks/*`, and `src/lib/*` are still imported by the Next app and were **kept**.
> - SPA-only dependencies (`vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `vitest`,
>   `plugin-inspect-react-code`, `react-router`, `react-router-dom`, `happy-dom`, `jsdom`,
>   `eslint-plugin-react-refresh`) were removed from `apps/web/package.json`.
>
> The historical content below is retained for context but **no longer reflects the architecture.**

**Date:** 2026-05-30
**Status:** Superseded (by Next.js decision, 2026-06-02)
**Scope:** `apps/web/`

## Context

The `apps/web/` package (`@adnexus/web` v2.0.0) contains two complete frontend systems:

1. **Vite SPA** — `index.html` + `src/main.tsx` + `src/App.tsx` with `HashRouter`, 48 routes, 65 page components in `src/spa-pages/`. Has a pre-built `dist/` output. Uses `react-router-dom` for client-side routing.

2. **Next.js App Router** — `next.config.ts` + `app/` directory with 18 pages under `/dashboard/*` and `/auth/*`. The `package.json` build command is `next build --webpack`.

The Vite SPA is the active, canonical frontend. The Next.js App Router pages are unused stubs — `App.tsx` imports exclusively from `spa-pages/`, and the Vite `dist/` directory contains the production build. The two systems have duplicate page components: `src/views/` is an identical copy of `src/spa-pages/` (neither Next.js nor the router uses `views/`).

## Decision

Consolidate on **Vite SPA** as the sole frontend. Remove the Next.js App Router layer.

### Rationale

1. **Vite is already canonical**: `App.tsx` with 48 routes imports from `spa-pages/`. The `dist/` directory contains a working production build. No Next.js page is actually served.

2. **AdNexus is a dashboard SPA**: All pages are behind authentication. There is no public SEO content that benefits from SSR. The marketing pages (Home, Blog, Pricing, Compare) are simple enough for client-side rendering.

3. **Simpler deployment**: Vite produces static files deployable to any CDN or static host. Next.js requires a Node.js server for SSR, API routes, and middleware.

4. **No duplicate state**: Removing Next.js eliminates the confusion of two routing systems and two component directories.

5. **Build speed**: Vite builds in seconds vs minutes for Next.js webpack.

### What was removed

- `apps/web/app/` directory (20 Next.js App Router files: layouts, pages, globals.css)
- `apps/web/next.config.ts`
- `apps/web/next-env.d.ts`
- `next` and `next-themes` from `package.json` dependencies
- `apps/web/src/views/` (exact duplicate of `spa-pages/`, unused)

### Build scripts updated

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

## When to Reconsider SSR

Revisit this decision if any of these conditions emerge:

1. **SEO-critical public content**: If marketing pages need server-rendered meta tags for search engine indexing, consider adding SSR back via Vite SSR (not Next.js) or a separate static site generator.

2. **Large initial bundle**: If the SPA bundle exceeds 500KB gzipped and impacts Time to Interactive, consider code splitting with `React.lazy()` before reaching for SSR.

3. **Performance on low-end devices**: If client-side rendering is too slow on target devices, Vite SSR (same codebase, no framework switch) is a lighter alternative than Next.js.

4. **Multi-tenant rendering**: If workspace-specific themes or configurations need to be injected at the server level, consider Cloudflare Workers or edge rendering rather than Next.js.

## Consequences

**Positive:**
- Single routing system, single component directory
- Faster builds and simpler deployment
- No confusion between `views/` and `spa-pages/`
- Reduced `node_modules` size

**Negative:**
- No SSR for initial page load performance
- Client-side routing only (no server-rendered pages)
- Must implement meta tags via `react-helmet` or similar for SEO
