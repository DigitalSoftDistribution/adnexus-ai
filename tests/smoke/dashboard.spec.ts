import { expect, test } from '@playwright/test';
import { authenticateAndNavigate } from './auth-helpers';
import { hasAuth, skipAuthReason } from './env';

/**
 * Dashboard IA surface smoke tests.
 *
 * Requires auth via PLAYWRIGHT_TEST_EMAIL+PLAYWRIGHT_TEST_PASSWORD or SMOKE_AUTH_TOKEN.
 * Configure preview targets in `.env.playwright.local` (see `.env.playwright.example`).
 */

test.describe('Dashboard IA — Command Center', () => {
  test('dashboard overview loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Campaign Workspace', () => {
  test('campaigns page loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard/campaigns');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — AI Operator', () => {
  test('AI agent page loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard/ai-agent');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Data Hub', () => {
  test('MCP server page loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard/mcp');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Settings / Admin', () => {
  test('settings page loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard/settings');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Dashboard IA — Integrations', () => {
  test('integrations page loads', async ({ page }) => {
    test.skip(!hasAuth(), skipAuthReason());
    await authenticateAndNavigate(page, '/en/dashboard/integrations');

    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
