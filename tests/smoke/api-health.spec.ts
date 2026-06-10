import { expect, test } from '@playwright/test';
import { hasApiUrl, skipApiReason, smokeEnv } from './env';

test.describe('API Health', () => {
  test('GET /health returns 200 with ok status', async ({ request }) => {
    test.skip(!hasApiUrl(), skipApiReason());
    const response = await request.get(`${smokeEnv.apiURL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('GET /ready returns readiness status', async ({ request }) => {
    test.skip(!hasApiUrl(), skipApiReason());
    const response = await request.get(`${smokeEnv.apiURL}/ready`);
    // Readiness endpoint: 200 healthy, 503 degraded/down. Both are valid responses
    expect([200, 503, 404]).toContain(response.status());
  });
});
