import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { hasTestCredentials, signInWithRetry } from './helpers';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate qa-playwright', async ({ page }) => {
  setup.skip(!hasTestCredentials(), 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');

  await signInWithRetry(page);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
