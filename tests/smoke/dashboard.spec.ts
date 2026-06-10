import { expect, test } from '@playwright/test';

/**
 * Dashboard IA surface smoke tests.
 *
 * These tests run AGAINST A RUNNING DEV SERVER. The authenticated ones
 * require a valid `adnexus_token` in localStorage. Provide test credentials
 * via env vars:
 *
 *   PLAYWRIGHT_TEST_EMAIL    – email for sign-in
 *   PLAYWRIGHT_TEST_PASSWORD – password for sign-in
 *
 * If credentials are not set, authenticated tests are skipped.
 */

const CREDENTIALS = {
  email: process.env.PLAYWRIGHT_TEST_EMAIL ?? '',
  password: process.env.PLAYWRIGHT_TEST_PASSWORD ?? '',
};

function hasCredentials(): boolean {
  return CREDENTIALS.email !== '' && CREDENTIALS.password !== '';
}

/**
 * Sign in via the API and store the token in localStorage, then navigate
 * to the target path. Uses window.fetch so the AuthProvider's fetch
 * interceptor auto-attaches Authorization headers.
 */
async function authenticateAndNavigate(
  page: import('@playwright/test').Page,
  targetPath: string,
) {
  await page.goto('/en/auth/signin');

  // Fill and submit the sign-in form
  await page.getByLabel('Email').fill(CREDENTIALS.email);
  await page.getByLabel('Password').fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // After sign-in, the app redirects to /dashboard via window.location.assign.
  // Wait for the dashboard to render.
  await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 15_000 });

  // If we're on onboarding, navigate to the target.
  if (!page.url().includes(targetPath)) {
    await page.goto(targetPath);
  }
}

test.describe('Dashboard IA — Command Center', () => {
  test('dashboard overview loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Campaign Workspace', () => {
  test('campaigns page loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard/campaigns');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — AI Operator', () => {
  test('AI agent page loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard/ai-agent');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Data Hub', () => {
  test('MCP server page loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard/mcp');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Settings / Admin', () => {
  test('settings page loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard/settings');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Integrations', () => {
  test('integrations page loads', async ({ page }) => {
    test.skip(!hasCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
    await authenticateAndNavigate(page, '/en/dashboard/integrations');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
