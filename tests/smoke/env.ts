/**
 * Shared Playwright smoke-test environment.
 *
 * Loaded from process env and optional repo-root `.env.playwright` files
 * (see playwright.config.ts). Preview defaults live in `.env.playwright.example`.
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiUrl(): string {
  const raw =
    process.env.PLAYWRIGHT_API_URL ??
    process.env.PLAYWRIGHT_API_BASE_URL ??
    process.env.API_URL ??
    '';
  return raw ? trimTrailingSlash(raw) : '';
}

export const smokeEnv = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173',
  apiURL: resolveApiUrl(),
  authToken: process.env.SMOKE_AUTH_TOKEN ?? '',
  testEmail: process.env.PLAYWRIGHT_TEST_EMAIL ?? '',
  testPassword: process.env.PLAYWRIGHT_TEST_PASSWORD ?? '',
} as const;

export function hasFormCredentials(): boolean {
  return smokeEnv.testEmail !== '' && smokeEnv.testPassword !== '';
}

export function hasAuth(): boolean {
  return hasFormCredentials() || smokeEnv.authToken !== '';
}

export function hasApiUrl(): boolean {
  return smokeEnv.apiURL !== '';
}

export function skipAuthReason(): string {
  return 'Set PLAYWRIGHT_TEST_EMAIL+PLAYWRIGHT_TEST_PASSWORD or SMOKE_AUTH_TOKEN';
}

export function skipApiReason(): string {
  return 'Set PLAYWRIGHT_API_URL (or PLAYWRIGHT_API_BASE_URL / API_URL) for API health checks';
}
