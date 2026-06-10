import { expect, test } from '@playwright/test';

/**
 * Auth page rendering smoke tests — no credentials required.
 * These tests verify that sign-in / sign-up pages render their forms
 * and navigation links correctly without any authentication.
 */
test.describe('Auth Pages — Rendering', () => {
  test('signin page renders with form and navigation links', async ({ page }) => {
    await page.goto('/en/auth/signin');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText(/Don't have an account/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('signup page renders with form and navigation links', async ({ page }) => {
    await page.goto('/en/auth/signup');

    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel(/Full Name|Name/)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByText(/Already have an account/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
