#!/usr/bin/env node
/**
 * Deep QA: mock-traffic seed quality + API matrix + platform sync against preview.
 * Usage: node qa/deep-wiremock-portfolio-2026-06-13/run-deep-test.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.API_BASE ?? 'https://adnexus-api.apps.softblaze.net';
const WEB_BASE = process.env.WEB_BASE ?? 'https://adnexus-ai.apps.softblaze.net';
const HARNESS_KEY = process.env.MOCK_TRAFFIC_HARNESS_KEY ?? 'qa-mock-traffic-2026-06-07';
const QA_EMAIL = process.env.QA_EMAIL ?? 'qa-owner@softblaze.net';
const QA_PASSWORD = process.env.QA_PASSWORD ?? 'AdNexus-QA-2026!';

async function req(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    webBase: WEB_BASE,
    phases: {},
    verdict: { pass: 0, fail: 0, skip: 0 },
  };

  const signIn = await req('POST', '/api/v2/auth/signin', {
    body: { email: QA_EMAIL, password: QA_PASSWORD },
  });
  if (!signIn.ok) throw new Error(`signin failed: ${signIn.status}`);
  const token = signIn.data?.data?.token ?? signIn.data?.token;

  // Phase: mock-traffic seed
  const seedRes = await req('POST', '/api/v2/integrations/mock-traffic/seed', {
    token,
    headers: { 'x-mock-traffic-key': HARNESS_KEY },
    body: {},
  });
  const seeded = seedRes.data?.data ?? seedRes.data ?? {};
  const adsRes = await req('GET', '/api/v2/ads?limit=200', { token });
  const ads = adsRes.data?.data?.ads ?? adsRes.data?.ads ?? [];
  const creativeTexts = new Set(ads.map((a) => a.creative_text ?? a.creativeText).filter(Boolean));
  const creativeTypes = new Set(ads.map((a) => a.creative_type ?? a.creativeType).filter(Boolean));
  const fatigueStatuses = new Set(ads.map((a) => a.fatigue_status ?? a.fatigueStatus).filter(Boolean));
  const platforms = new Set(ads.map((a) => a.platform).filter(Boolean));

  const seedChecks = [
    { name: 'seed_http_ok', pass: seedRes.ok },
    { name: 'ads_gte_48', pass: ads.length >= 48, detail: ads.length },
    { name: 'unique_copy_gte_12', pass: creativeTexts.size >= 12, detail: creativeTexts.size },
    { name: 'creative_types_gte_3', pass: creativeTypes.size >= 3, detail: [...creativeTypes] },
    { name: 'fatigue_variety', pass: fatigueStatuses.size >= 2, detail: [...fatigueStatuses] },
    { name: 'four_platforms', pass: platforms.size >= 4, detail: [...platforms] },
    { name: 'cta_in_copy', pass: ads.some((a) => (a.creative_text ?? a.creativeText)?.includes('CTA:')) },
  ];
  report.phases.mockTrafficSeed = {
    seeded,
    adsListed: ads.length,
    sampleAd: ads[0]
      ? {
          name: ads[0].name,
          platform: ads[0].platform,
          creativeType: ads[0].creative_type ?? ads[0].creativeType,
          creativeText: (ads[0].creative_text ?? ads[0].creativeText)?.slice(0, 120),
          fatigueStatus: ads[0].fatigue_status ?? ads[0].fatigueStatus,
        }
      : null,
    checks: seedChecks,
  };

  // Phase: API matrix subset
  const adId = ads[0]?.id;
  const adsetId = ads[0]?.adsetId ?? ads[0]?.adset_id;
  const matrix = [];
  const matrixDefs = [
    ['Reports', 'GET /reports/templates', () => req('GET', '/api/v2/reports/templates', { token })],
    ['Campaigns', 'GET /campaigns', () => req('GET', '/api/v2/campaigns?limit=20', { token })],
    ['Ads', 'GET /ads/:id', () => req('GET', `/api/v2/ads/${adId}`, { token })],
    ['Ads', 'GET /ads/:id/performance', () => req('GET', `/api/v2/ads/${adId}/performance`, { token })],
    ['Bulk', 'POST /ads/bulk/validate', () =>
      req('POST', '/api/v2/ads/bulk/validate', {
        token,
        body: { specs: [{ adsetId, name: 'QA bulk validate' }] },
      })],
    ['Analytics', 'GET /analytics/data', () => req('GET', '/api/v2/analytics/data', { token })],
    ['MCP', 'POST /mcp/tools/mcp_get_status/invoke', () =>
      req('POST', '/api/v2/mcp/tools/mcp_get_status/invoke', { token, body: {} })],
    ['Agent', 'GET /agent/sessions', () => req('GET', '/api/v2/agent/sessions?limit=5', { token })],
    ['Integrations', 'GET /integrations/accounts', () =>
      req('GET', '/api/v2/integrations/accounts', { token })],
  ];
  for (const [area, endpoint, fn] of matrixDefs) {
    const r = await fn();
    matrix.push({ area, endpoint, status: r.ok ? 'PASS' : 'FAIL', http: r.status });
  }
  report.phases.apiMatrix = { results: matrix };

  // Phase: platform account sync (WireMock)
  const accountsRes = await req('GET', '/api/v2/integrations/accounts', { token });
  const accounts = accountsRes.data?.data?.accounts ?? accountsRes.data?.accounts ?? [];
  const mockAccount = accounts.find((a) => a.platform === 'meta') ?? accounts[0];
  let syncResult = null;
  if (mockAccount?.id) {
    const syncRes = await req('POST', `/api/v2/integrations/accounts/${mockAccount.id}/sync`, { token });
    syncResult = {
      http: syncRes.status,
      ok: syncRes.ok,
      data: syncRes.data?.data ?? syncRes.data,
    };
  }
  report.phases.platformSync = {
    accountId: mockAccount?.id,
    platform: mockAccount?.platform,
    sync: syncResult,
    wiremockLive: syncResult?.data?.liveSynced === true,
    campaignsSynced: syncResult?.data?.campaignsSynced ?? 0,
  };

  // Aggregate verdict
  for (const c of seedChecks) {
    report.verdict[c.pass ? 'pass' : 'fail']++;
  }
  for (const m of matrix) {
    report.verdict[m.status === 'PASS' ? 'pass' : 'fail']++;
  }
  if (syncResult) {
    report.verdict[syncResult.data?.liveSynced ? 'pass' : 'fail']++;
    if (syncResult.data?.campaignsSynced > 0) report.verdict.pass++;
    else report.verdict.fail++;
  } else {
    report.verdict.skip++;
  }

  report.overall = report.verdict.fail === 0 ? 'PASS' : 'FAIL';
  mkdirSync(__dir, { recursive: true });
  writeFileSync(join(__dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.overall === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
