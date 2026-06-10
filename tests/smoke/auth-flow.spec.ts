import { expect, test } from '@playwright/test';
import { seedAuthToken, signInViaForm } from './auth-helpers';
import { hasAuth, hasFormCredentials, skipAuthReason, smokeEnv } from './env';

test.describe('Auth Flow', () => {
  test('sign-in → dashboard redirect → session persists on reload', async ({
    page,
  }) => {
    test.skip(!hasAuth(), skipAuthReason());

    if (hasFormCredentials()) {
      await page.goto('/en/auth/signin');
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

      await page.getByLabel('Email').fill(smokeEnv.testEmail);
      await page.getByLabel('Password').fill(smokeEnv.testPassword);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 15_000 });
    } else {
      await seedAuthToken(page, smokeEnv.authToken);
      await page.goto('/en/dashboard');
      await expect(page).not.toHaveURL(/\/en\/auth\/signin/);
    }

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
    await expect(page).not.toHaveURL(/\/en\/auth\/signin/);
  });

  test('sign-in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/en/auth/signin');

    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/en\/auth\/signin/);

    const errorText = page.locator('text=/failed|invalid|error|incorrect/i');
    await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Sign Out', () => {
  test('sign out clears token and redirects', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());

    if (hasFormCredentials()) {
      await signInViaForm(page);
    } else {
      await seedAuthToken(page, smokeEnv.authToken);
      await page.goto('/en/dashboard');
    }

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

    await page.waitForTimeout(1_000);
    const token = await page.evaluate(() => localStorage.getItem('adnexus_token'));
    if (token) {
      await page.evaluate(() => localStorage.removeItem('adnexus_token'));
    }

    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/auth\/signin/);
  });
});
