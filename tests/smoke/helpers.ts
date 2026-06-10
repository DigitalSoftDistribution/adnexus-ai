import { expect, type Page } from '@playwright/test';

const TRANSIENT_NAV_ERRORS = ['ERR_NETWORK_CHANGED', 'ERR_CONNECTION_RESET', 'ERR_HTTP2'];

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
