import type { Page } from '@playwright/test';
import { hasFormCredentials, smokeEnv } from './env';

export async function seedAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem('adnexus_token', value);
  }, token);
}

/** Sign in via form or inject SMOKE_AUTH_TOKEN, then open targetPath. */
export async function authenticateAndNavigate(page: Page, targetPath: string): Promise<void> {
  if (smokeEnv.authToken) {
    await seedAuthToken(page, smokeEnv.authToken);
    await page.goto(targetPath);
    return;
  }

  if (!hasFormCredentials()) {
    throw new Error('No auth credentials configured');
  }

  await signInViaForm(page);

  if (!page.url().includes(targetPath)) {
    await page.goto(targetPath);
  }
}

export async function signInViaForm(page: Page): Promise<void> {
  await page.goto('/en/auth/signin');
  await page.getByLabel('Email').fill(smokeEnv.testEmail);
  await page.getByLabel('Password').fill(smokeEnv.testPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 15_000 });
}
