import { afterEach, describe, expect, it, vi } from 'vitest';

const requiredEnv = {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-service-key',
  JWT_SECRET: 'test-jwt-secret-key-with-32-characters',
};

async function loadConfig(overrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...requiredEnv, ...overrides })) {
    vi.stubEnv(key, value);
  }
  return import('./index');
}

describe('platform base URL config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('accepts SUPABASE_SERVICE_ROLE_KEY as a compatibility alias', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_KEY', undefined);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-key-with-32-characters');

    const { config } = await import('./index');

    expect(config.supabase.serviceKey).toBe('test-service-role-key');
  });

  it('defaults external platform clients to their production API hosts', async () => {
    const { config } = await loadConfig();

    expect(config.meta.graphUrl).toBe('https://graph.facebook.com');
    expect(config.google.adsApiUrl).toBe('https://googleads.googleapis.com/v16');
    expect(config.google.oauthUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(config.google.tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(config.google.tokenInfoUrl).toBe('https://oauth2.googleapis.com/tokeninfo');
    expect(config.tiktok.apiUrl).toBe('https://business-api.tiktok.com/open_api/v1.3');
    expect(config.snap.apiBaseUrl).toBe('https://adsapi.snapchat.com/v1');
    expect(config.snap.oauthBaseUrl).toBe('https://accounts.snapchat.com/accounts/oauth2');
  });

  it('allows previews and tests to route all platform clients through WireMock', async () => {
    const { config } = await loadConfig({
      META_GRAPH_URL: 'http://wiremock:8080',
      GOOGLE_ADS_API_URL: 'http://wiremock:8080/v16',
      GOOGLE_OAUTH_URL: 'http://wiremock:8080/google/oauth2/auth',
      GOOGLE_TOKEN_URL: 'http://wiremock:8080/token',
      GOOGLE_TOKEN_INFO_URL: 'http://wiremock:8080/tokeninfo',
      TIKTOK_API_URL: 'http://wiremock:8080/open_api/v1.3',
      SNAP_API_BASE_URL: 'http://wiremock:8080/v1',
      SNAP_OAUTH_BASE_URL: 'http://wiremock:8080/snap/oauth2',
    });

    expect(config.meta.graphUrl).toBe('http://wiremock:8080');
    expect(config.google.adsApiUrl).toBe('http://wiremock:8080/v16');
    expect(config.google.oauthUrl).toBe('http://wiremock:8080/google/oauth2/auth');
    expect(config.google.tokenUrl).toBe('http://wiremock:8080/token');
    expect(config.google.tokenInfoUrl).toBe('http://wiremock:8080/tokeninfo');
    expect(config.tiktok.apiUrl).toBe('http://wiremock:8080/open_api/v1.3');
    expect(config.snap.apiBaseUrl).toBe('http://wiremock:8080/v1');
    expect(config.snap.oauthBaseUrl).toBe('http://wiremock:8080/snap/oauth2');
  });
});
