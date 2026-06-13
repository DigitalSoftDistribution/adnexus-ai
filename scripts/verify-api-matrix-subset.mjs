#!/usr/bin/env node
/** Re-run API matrix subset after deploy fix #176 */
const API_BASE = process.env.API_BASE ?? 'https://adnexus-api.apps.softblaze.net';
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
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const results = [];
  const signIn = await req('POST', '/api/v2/auth/signin', {
    body: { email: QA_EMAIL, password: QA_PASSWORD },
  });
  if (!signIn.ok) throw new Error(`signin failed: ${signIn.status} ${JSON.stringify(signIn.data).slice(0, 200)}`);
  const token = signIn.data?.data?.token ?? signIn.data?.token;

  await req('POST', '/api/v2/integrations/mock-traffic/seed', {
    token,
    headers: { 'x-mock-traffic-key': HARNESS_KEY },
    body: {},
  });

  const adsList = await req('GET', '/api/v2/ads?limit=1', { token });
  const adId = adsList.data?.data?.ads?.[0]?.id ?? adsList.data?.ads?.[0]?.id;
  if (!adId) throw new Error('no ad id');

  const checks = [
    ['Reports', 'GET /reports/templates', () => req('GET', '/api/v2/reports/templates', { token })],
    ['Ads', 'GET /ads/:id', () => req('GET', `/api/v2/ads/${adId}`, { token })],
    ['Ads', 'GET /ads/:id/performance', () => req('GET', `/api/v2/ads/${adId}/performance`, { token })],
    ['Bulk', 'POST /ads/bulk/validate', async () => {
      const adsetId = adsList.data?.data?.ads?.[0]?.adsetId ?? adsList.data?.ads?.[0]?.adset_id;
      return req('POST', '/api/v2/ads/bulk/validate', {
        token,
        body: { specs: [{ adsetId, name: 'QA bulk validate test' }] },
      });
    }],
    ['Analytics', 'GET /analytics/data', () => req('GET', '/api/v2/analytics/data', { token })],
    ['MCP', 'POST /mcp/tools/:name/invoke', () => req('POST', '/api/v2/mcp/tools/mcp_get_status/invoke', { token, body: {} })],
  ];

  for (const [area, endpoint, fn] of checks) {
    const r = await fn();
    results.push({
      area,
      endpoint,
      status: r.ok ? 'PASS' : 'FAIL',
      http: r.status,
    });
    console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.status}] ${area} ${endpoint}`);
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const summary = { runAt: new Date().toISOString(), apiBase: API_BASE, pass, fail, total: results.length, results };
  console.log('\nJSON:', JSON.stringify(summary, null, 2));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
