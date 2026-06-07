import { expect, test } from '@playwright/test';

const healthUrl = process.env.PLAYWRIGHT_API_HEALTH_URL;

test('public app home loads', async ({ page }) => {
  await page.goto('/en');

  await expect(page).toHaveTitle(/AdNexus AI/);
  await expect(page.getByText('The Intelligent Campaign Workspace')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start Free Trial' }).first()).toBeVisible();
});

test('signup page renders', async ({ page }) => {
  await page.goto('/en/auth/signup');

  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByLabel('Full Name')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
});

test('signin page renders', async ({ page }) => {
  await page.goto('/en/auth/signin');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('protected dashboard redirects unauthenticated users to signin', async ({ page }) => {
  await page.goto('/en/dashboard');

  await expect(page).toHaveURL(/\/en\/auth\/signin/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('configured API health endpoint responds successfully', async ({ request }) => {
  test.skip(!healthUrl, 'Set PLAYWRIGHT_API_HEALTH_URL to enable API health smoke.');

  const response = await request.get(healthUrl!);
  expect(response.ok()).toBeTruthy();
});
