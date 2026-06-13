import { expect, test } from '@playwright/test';
import { expectRedirectToSignin, gotoWithRetry } from './helpers';

test.describe('Public Pages', () => {
  test('home page loads with key content and no console errors', async ({ page }) => {
    const KNOWN_DEPRECATION_PATTERNS = [
      /legacyBehavior/,
      /scroll-behavior/,
    ];

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!KNOWN_DEPRECATION_PATTERNS.some((p) => p.test(text))) {
          errors.push(text);
        }
      }
    });

    await page.goto('/en');

    await expect(page).toHaveTitle(/AdNexus AI/);
    await expect(page.getByText('The Intelligent Campaign Workspace')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Free Trial' }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('signup page renders form elements', async ({ page }) => {
    await page.goto('/en/auth/signup');

    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel(/Full Name|Name/)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  test('signin page renders form elements', async ({ page }) => {
    await page.goto('/en/auth/signin');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('/auth/login redirects to signin', async ({ page }) => {
    await page.goto('/en/auth/login');
    await expect(page).toHaveURL(/\/en\/auth\/signin/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await gotoWithRetry(page, '/en/pricing');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('features page loads', async ({ page }) => {
    await gotoWithRetry(page, '/en/features');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});

test.describe('Auth Guard — Unauthenticated Redirects', () => {
  const protectedPaths = [
    '/en/dashboard',
    '/en/dashboard/campaigns',
    '/en/dashboard/ai-agent',
    '/en/dashboard/integrations',
    '/en/dashboard/mcp',
    '/en/dashboard/settings',
    '/en/onboarding',
  ];

  for (const path of protectedPaths) {
    const label = path.replace('/en/', '').replace(/\//g, ' / ');
    test(`${label} redirects unauthenticated users to signin`, async ({ page }) => {
      await gotoWithRetry(page, path);
      await expectRedirectToSignin(page);
    });
  }
});
