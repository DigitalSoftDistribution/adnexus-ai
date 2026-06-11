import { expect, test } from '@playwright/test';

import { gotoAuthenticated, hasTestCredentials } from './helpers';

/**
 * Dashboard IA surface smoke tests — reuse auth.setup storageState so each
 * test does not hit sign-in (avoids qa-playwright rate-limit flakes).
 */

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  test.skip(!hasTestCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');
  await page.waitForTimeout(300);
});

test.describe('Dashboard IA — Command Center', () => {
  test('dashboard overview loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Campaign Workspace', () => {
  test('campaigns page loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard/campaigns');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — AI Operator', () => {
  test('AI agent page loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard/ai-agent');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Data Hub', () => {
  test('MCP server page loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard/mcp');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Settings / Admin', () => {
  test('settings page loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard/settings');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Integrations', () => {
  test('integrations page loads', async ({ page }) => {
    await gotoAuthenticated(page, '/en/dashboard/integrations');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
