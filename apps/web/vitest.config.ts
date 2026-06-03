import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vitest config for the Next.js app's React component tests (RTL).
// Mirrors the Next tsconfig `@/*` alias (-> apps/web root).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, '.') },
      // next-intl's client navigation imports `next/navigation` without a
      // file extension, which Vitest's ESM resolver can't locate inside the
      // pnpm store. Pin the bare specifier to the concrete entry file.
      {
        find: /^next\/navigation$/,
        replacement: path.resolve(__dirname, 'node_modules/next/navigation.js'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,hooks,lib}/**/*.{test,spec}.{ts,tsx}'],
    server: {
      deps: {
        // Transform next-intl so its bare `next/navigation` import is rewritten
        // through Vite's resolver (and the alias above) instead of Node's.
        inline: ['next-intl'],
      },
    },
  },
});
