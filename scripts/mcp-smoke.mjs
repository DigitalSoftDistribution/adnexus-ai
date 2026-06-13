#!/usr/bin/env node
/**
 * Smoke-check MCP HTTP catalog endpoints on a running AdNexus API.
 *
 * Usage:
 *   node scripts/mcp-smoke.mjs --base-url https://adnexus-api.apps.softblaze.net --token <jwt>
 *
 * Without --token, verifies unauthenticated routes return 401 (not 404).
 */

const args = process.argv.slice(2);
let baseUrl = process.env.API_URL || 'http://localhost:3001';
let token = process.env.SMOKE_AUTH_TOKEN || '';

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--base-url') baseUrl = args[++i];
  else if (args[i] === '--token') token = args[++i];
  else if (args[i] === '--help') {
    console.log('Usage: node scripts/mcp-smoke.mjs [--base-url URL] [--token JWT]');
    process.exit(0);
  }
}

const join = (path) => `${baseUrl.replace(/\/+$/, '')}${path}`;

async function probe(name, url, init = {}) {
  const res = await fetch(url, init);
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { name, status: res.status, body };
}

const checks = [];

for (const path of ['/api/v2/mcp/status', '/api/v2/mcp/tools']) {
  checks.push(probe(`unauth ${path}`, join(path)));
}

if (token) {
  const headers = { Authorization: `Bearer ${token}` };
  checks.push(probe('authed /api/v2/mcp/status', join('/api/v2/mcp/status'), { headers }));
  checks.push(probe('authed /api/v2/mcp/tools?mode=draft', join('/api/v2/mcp/tools?mode=draft'), { headers }));
}

const results = await Promise.all(checks);
let failed = 0;

for (const result of results) {
  const ok = token
    ? result.name.startsWith('authed')
      ? result.status === 200 && result.body?.success === true
      : result.status === 401
    : result.status === 401;

  console.log(`${ok ? 'PASS' : 'FAIL'} ${result.name} (${result.status})`);
  if (!ok) {
    failed += 1;
    console.log(JSON.stringify(result.body, null, 2));
  }
}

if (token) {
  const status = results.find((r) => r.name === 'authed /api/v2/mcp/status')?.body?.data;
  if (status) {
    console.log(`liveTransport=${status.liveTransport} catalog.total=${status.catalog?.total}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
