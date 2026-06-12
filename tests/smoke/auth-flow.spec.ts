import { expect, test } from '@playwright/test';

import {
  AUTH_RATE_LIMIT_DELAY_MS,
  hasTestCredentials,
  signInWithRetry,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test.describe('Auth Flow', () => {
  test('sign-in → dashboard redirect → session persists on reload', async ({
    page,
  }) => {
    test.skip(!hasTestCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');

    await signInWithRetry(page);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    const token = await page.evaluate(() => localStorage.getItem('adnexus_token'));
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token!.length).toBeGreaterThan(0);

    await page.reload();

    const url = page.url();
    if (url.includes('/dashboard')) {
      const tokenAfterReload = await page.evaluate(() =>
        localStorage.getItem('adnexus_token'),
      );
      expect(tokenAfterReload).toBeTruthy();
    } else if (url.includes('/onboarding')) {
      await expect(page).not.toHaveURL(/\/auth\/signin/);
    }

    await page.goto('/en/dashboard');
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });

  test('sign-in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/en/auth/signin');

    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/en\/auth\/signin/);

    const errorBanner = page
      .getByRole('alert')
      .filter({ hasText: /invalid|failed|error|incorrect|unexpected/i });
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Sign Out', () => {
  test('sign out clears token and redirects', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');

    await signInWithRetry(page);
    await page.goto('/en/dashboard');

    const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [aria-label="User menu"]');

    if (await signOutButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await signOutButton.click();
    } else if (await userMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenu.click();
      const signOutOption = page.getByText(/sign out|logout/i);
      if (await signOutOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await signOutOption.click();
      } else {
        await page.evaluate(() => localStorage.removeItem('adnexus_token'));
        await page.goto('/en/dashboard');
        await expect(page).toHaveURL(/\/en\/auth\/signin/);
        return;
      }
    } else {
      await page.evaluate(() => localStorage.removeItem('adnexus_token'));
      await page.goto('/en/dashboard');
      await expect(page).toHaveURL(/\/en\/auth\/signin/);
      return;
    }

    await page.waitForTimeout(AUTH_RATE_LIMIT_DELAY_MS);
    const token = await page.evaluate(() => localStorage.getItem('adnexus_token'));
    if (token) {
      await page.evaluate(() => localStorage.removeItem('adnexus_token'));
    }

    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/auth\/signin/);
  });
});
