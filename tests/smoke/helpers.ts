import { expect, type Page } from '@playwright/test';

const TRANSIENT_NAV_ERRORS = ['ERR_NETWORK_CHANGED', 'ERR_CONNECTION_RESET', 'ERR_HTTP2'];

/** Dedicated QA account for preview smoke (override via env). */
export const TEST_CREDENTIALS = {
  email: process.env.PLAYWRIGHT_TEST_EMAIL ?? 'qa-playwright@softblaze.net',
  password: process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'AdNexus-QA-2026!',
};

export function hasTestCredentials(): boolean {
  return TEST_CREDENTIALS.email !== '' && TEST_CREDENTIALS.password !== '';
}

/** Pause between auth API calls to avoid Supabase / API rate limits under parallel load. */
export const AUTH_RATE_LIMIT_DELAY_MS = Number(
  process.env.PLAYWRIGHT_AUTH_DELAY_MS ?? 1_500,
);

let lastSignInAt = 0;

async function waitForAuthRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastSignInAt;
  if (elapsed < AUTH_RATE_LIMIT_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, AUTH_RATE_LIMIT_DELAY_MS - elapsed));
  }
  lastSignInAt = Date.now();
}

/**
 * Retry page.goto when Chromium reports transient network errors (common
 * against remote preview hosts under parallel load).
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  options: { retries?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' } = {},
): Promise<void> {
  const { retries = 3, waitUntil = 'domcontentloaded' } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await page.goto(url, { waitUntil });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransient = TRANSIENT_NAV_ERRORS.some((code) => message.includes(code));
      if (!isTransient || attempt === retries - 1) {
        throw error;
      }
      await page.waitForTimeout(500 * (attempt + 1));
    }
  }
}

/** Wait for client-side auth guard to send unauthenticated users to sign-in. */
export async function expectRedirectToSignin(page: Page): Promise<void> {
  await page.waitForURL(/\/en\/auth\/signin/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/en\/auth\/signin/);
}

/**
 * Sign in via the UI with retries for rate limits and transient failures.
 * Reuse storageState from auth.setup.ts in dashboard tests to avoid repeat sign-ins.
 */
export async function signInWithRetry(
  page: Page,
  options: { retries?: number } = {},
): Promise<void> {
  const { retries = 3 } = options;

  if (!hasTestCredentials()) {
    throw new Error('Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    await waitForAuthRateLimit();
    await gotoWithRetry(page, '/en/auth/signin');

    await page.getByLabel('Email').fill(TEST_CREDENTIALS.email);
    await page.getByLabel('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    try {
      await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 20_000 });
      const token = await page.evaluate(() => localStorage.getItem('adnexus_token'));
      if (token) {
        return;
      }
    } catch {
      const rateLimited = await page
        .getByRole('alert')
        .filter({ hasText: /too many|rate limit|try again|429/i })
        .isVisible()
        .catch(() => false);

      if (rateLimited && attempt < retries - 1) {
        await page.waitForTimeout(AUTH_RATE_LIMIT_DELAY_MS * (attempt + 2));
        continue;
      }

      if (attempt === retries - 1) {
        throw new Error(`Sign-in failed after ${retries} attempts (last URL: ${page.url()})`);
      }

      await page.waitForTimeout(AUTH_RATE_LIMIT_DELAY_MS * (attempt + 1));
    }
  }
}

/** Navigate to a dashboard path when already authenticated (storageState). */
export async function gotoAuthenticated(page: Page, targetPath: string): Promise<void> {
  await gotoWithRetry(page, targetPath);
  if (page.url().includes('/auth/signin')) {
    await signInWithRetry(page);
    await gotoWithRetry(page, targetPath);
  }
  await expect(page).not.toHaveURL(/\/auth\/signin/);
}
