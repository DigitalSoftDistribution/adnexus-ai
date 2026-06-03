import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vitest config for the Next.js app's React component tests (RTL).
// Mirrors the Next tsconfig `@/*` alias (-> apps/web root).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,hooks,lib}/**/*.{test,spec}.{ts,tsx}'],
  },
});
