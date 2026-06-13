/**
 * Live WireMock integration — exercises Meta + Google API clients against stubs.
 * Requires WireMock running (pnpm wiremock:up). No database or Redis needed.
 *
 * Usage:
 *   WIREMOCK_BASE_URL=http://localhost:9087 pnpm wiremock:platform
 */

const wiremockBase = process.env.WIREMOCK_BASE_URL ?? 'http://localhost:9085';

function applyWiremockEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? 'mock-service-key-for-wiremock-tests';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'wiremock-test-jwt-secret-32chars-min';

  process.env.META_APP_ID = 'mock-meta-app-id';
  process.env.META_APP_SECRET = 'mock-meta-app-secret';
  process.env.META_API_VERSION = 'v19.0';
  process.env.META_GRAPH_URL = wiremockBase;

  process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'mock-google-client-secret';
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'mock-google-dev-token';
  process.env.GOOGLE_ADS_API_URL = `${wiremockBase}/v16`;
  process.env.GOOGLE_OAUTH_URL = `${wiremockBase}/google/oauth2/auth`;
  process.env.GOOGLE_TOKEN_URL = `${wiremockBase}/token`;
  process.env.GOOGLE_TOKEN_INFO_URL = `${wiremockBase}/tokeninfo`;
}

applyWiremockEnv();

type CheckResult = { name: string; ok: boolean; detail?: string };

const results: CheckResult[] = [];

function pass(name: string): void {
  results.push({ name, ok: true });
  console.log(`PASS ${name}`);
}

function fail(name: string, detail: string): void {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}: ${detail}`);
}

async function main(): Promise<void> {
  const health = await fetch(`${wiremockBase}/health`);
  const healthBody = await health.text();
  if (!health.ok || !healthBody.includes('adnexus-wiremock')) {
    fail('wiremock health', `HTTP ${health.status} ${healthBody.slice(0, 120)}`);
    summarize();
    process.exit(1);
  }
  pass('wiremock health');

  const {
    refreshMetaToken,
    getMetaAdAccounts,
    getMetaCampaigns,
    getMetaInsights,
  } = await import('../../src/services/meta-api');

  const {
    refreshGoogleToken,
    fetchGoogleCampaigns,
    fetchGoogleInsights,
    validateGoogleToken,
  } = await import('../../src/services/google-api');

  // ── OAuth token refresh ──────────────────────────────────────────
  try {
    const metaRefresh = await refreshMetaToken('mock-meta-refresh-token');
    if (metaRefresh.access_token?.startsWith('EAA')) {
      pass('meta oauth token refresh');
    } else {
      fail('meta oauth token refresh', `unexpected token: ${metaRefresh.access_token}`);
    }
  } catch (e) {
    fail('meta oauth token refresh', (e as Error).message);
  }

  try {
    const googleRefresh = await refreshGoogleToken('mock-google-refresh-token');
    if (googleRefresh.accessToken?.startsWith('ya29.')) {
      pass('google oauth token refresh');
    } else {
      fail('google oauth token refresh', `unexpected token: ${googleRefresh.accessToken}`);
    }
  } catch (e) {
    fail('google oauth token refresh', (e as Error).message);
  }

  try {
    const valid = await validateGoogleToken('ya29.MockGoogleAccessToken1234567890');
    if (valid) pass('google token info validation');
    else fail('google token info validation', 'validateGoogleToken returned false');
  } catch (e) {
    fail('google token info validation', (e as Error).message);
  }

  // ── Platform sync API paths (read-only) ──────────────────────────
  const metaToken = 'EAAMockAccessToken1234567890';

  try {
    const accounts = await getMetaAdAccounts(metaToken);
    if (accounts.some((a) => a.name?.includes('WireMock Meta'))) {
      pass('meta platform sync — ad accounts');
    } else {
      fail('meta platform sync — ad accounts', JSON.stringify(accounts).slice(0, 200));
    }
  } catch (e) {
    fail('meta platform sync — ad accounts', (e as Error).message);
  }

  try {
    const campaigns = await getMetaCampaigns('act_1234567890', metaToken);
    if (campaigns.some((c) => c.name?.includes('WireMock Meta Prospecting'))) {
      pass('meta platform sync — campaigns');
    } else {
      fail('meta platform sync — campaigns', JSON.stringify(campaigns).slice(0, 200));
    }
  } catch (e) {
    fail('meta platform sync — campaigns', (e as Error).message);
  }

  try {
    const insights = await getMetaInsights('12020000000000001', metaToken, '2026-01-01', '2026-06-10');
    if (Number(insights.impressions) > 0) {
      pass('meta platform sync — insights (metrics)');
    } else {
      fail('meta platform sync — insights (metrics)', JSON.stringify(insights).slice(0, 200));
    }
  } catch (e) {
    fail('meta platform sync — insights (metrics)', (e as Error).message);
  }

  const googleToken = 'ya29.MockGoogleAccessToken1234567890';

  try {
    const campaigns = await fetchGoogleCampaigns('1234567890', googleToken, { status: 'all' });
    if (campaigns.some((c) => c.name?.includes('WireMock Google'))) {
      pass('google platform sync — campaigns');
    } else {
      fail('google platform sync — campaigns', JSON.stringify(campaigns).slice(0, 200));
    }
  } catch (e) {
    fail('google platform sync — campaigns', (e as Error).message);
  }

  try {
    const googleCampaigns = await fetchGoogleCampaigns('1234567890', googleToken, { status: 'all' });
    const campaignRef =
      googleCampaigns[0]?.resource_name ?? 'customers/1234567890/campaigns/1111111111';
    const insights = await fetchGoogleInsights([campaignRef], googleToken, {
      start: '2026-01-01',
      end: '2026-06-10',
    });
    if (insights.length > 0 && Number(insights[0]?.metrics_impressions) > 0) {
      pass('google platform sync — insights (metrics)');
    } else {
      fail('google platform sync — insights (metrics)', JSON.stringify(insights).slice(0, 200));
    }
  } catch (e) {
    fail('google platform sync — insights (metrics)', (e as Error).message);
  }

  summarize();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function summarize(): void {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(` WireMock platform integration: ${passed} passed, ${failed} failed`);
  console.log(` WireMock base: ${wiremockBase}`);
  console.log('═══════════════════════════════════════════');
  if (failed > 0) {
    for (const r of results.filter((x) => !x.ok)) {
      console.error(`  ✗ ${r.name}: ${r.detail}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
