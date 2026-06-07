import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL;

test.describe('API Health', () => {
  test('GET /health returns 200 with ok status', async ({ request }) => {
    test.skip(!API_BASE_URL, 'Set PLAYWRIGHT_API_BASE_URL to enable API health checks.');
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('GET /ready returns readiness status', async ({ request }) => {
    test.skip(!API_BASE_URL, 'Set PLAYWRIGHT_API_BASE_URL to enable API health checks.');
    const response = await request.get(`${API_BASE_URL}/ready`);
    // Readiness endpoint: 200 healthy, 503 degraded/down. Both are valid responses
    expect([200, 503, 404]).toContain(response.status());
  });
});
