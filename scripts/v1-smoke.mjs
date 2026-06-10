#!/usr/bin/env node

import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const options = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  webUrl: process.env.WEB_URL || '',
  timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS || 8000),
  retries: Number(process.env.SMOKE_RETRIES || 1),
  origin: process.env.SMOKE_ORIGIN || process.env.WEB_URL || 'https://adnexus-ai.apps.softblaze.net',
  token: process.env.SMOKE_AUTH_TOKEN || '',
};

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--base-url') {
    options.baseUrl = readValue(args, i, arg);
    i += 1;
  } else if (arg === '--web-url') {
    options.webUrl = readValue(args, i, arg);
    if (!process.env.SMOKE_ORIGIN) {
      options.origin = options.webUrl;
    }
    i += 1;
  } else if (arg === '--timeout-ms') {
    options.timeoutMs = Number(readValue(args, i, arg));
    i += 1;
  } else if (arg === '--retries') {
    options.retries = Number(readValue(args, i, arg));
    i += 1;
  } else if (arg === '--origin') {
    options.origin = readValue(args, i, arg);
    i += 1;
  } else if (arg === '--token') {
    options.token = readValue(args, i, arg);
    i += 1;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: pnpm smoke:v1 -- --base-url <api-url> [--web-url <web-url>] [--origin <origin>] [--token <jwt>] [--timeout-ms 8000] [--retries 1]

Checks AdNexus V1 preview/runtime readiness:
  - API /health, /ready, /metrics, /api/v2/openapi.json
  - API CORS preflight for preview origin
  - API unauthenticated behavior for protected /api/v2 routes
  - Optional authenticated probes when SMOKE_AUTH_TOKEN or --token is supplied
  - Optional web routes and same-origin /api/v2 rewrite behavior

Environment alternatives: API_URL, WEB_URL, SMOKE_ORIGIN, SMOKE_AUTH_TOKEN, SMOKE_TIMEOUT_MS, SMOKE_RETRIES.`);
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/+$/, '')}${path}`;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'manual', ...init });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => '');
}

function hasJsonErrorEnvelope(body) {
  return Boolean(
    body &&
      typeof body === 'object' &&
      body.success === false &&
      body.error &&
      typeof body.error === 'object' &&
      typeof body.error.message === 'string',
  );
}

async function check({ name, url, expect, validate, init }) {
  let lastError;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init);
      const body = await parseResponse(response);
      const ok = expect(response, body) && (!validate || validate(body, response));
      if (ok) {
        return { name, ok: true, status: response.status, url };
      }

      lastError = new Error(`unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < options.retries) await delay(500 * (attempt + 1));
  }

  return { name, ok: false, url, error: lastError?.message || 'unknown error' };
}

const unauthenticatedApiPaths = [
  '/api/v2/campaigns/summary',
  '/api/v2/integrations',
  '/api/v2/drafts',
  '/api/v2/billing',
  '/api/v2/settings/workspace',
  '/api/v2/reports',
];

const webRoutes = [
  '/en',
  '/en/auth/signup',
  '/en/auth/signin',
  '/en/auth/login',
  '/en/onboarding',
  '/en/dashboard',
  '/en/dashboard/campaigns',
  '/en/dashboard/drafts',
  '/en/dashboard/billing',
  '/en/dashboard/settings',
  '/en/dashboard/integrations',
  '/en/dashboard/reports',
];

const checks = [
  {
    name: 'api health',
    url: joinUrl(options.baseUrl, '/health'),
    expect: (response) => response.status === 200,
    validate: (body) => !body || typeof body === 'string' || body.status === 'ok' || body.status === 'healthy',
  },
  {
    name: 'api readiness',
    url: joinUrl(options.baseUrl, '/ready'),
    expect: (response) => response.status === 200,
    validate: (body) => !body || typeof body === 'string' || ['ready', 'healthy', 'degraded'].includes(body.status),
  },
  {
    name: 'api metrics',
    url: joinUrl(options.baseUrl, '/metrics'),
    expect: (response) => response.status === 200,
    validate: (body) => typeof body === 'string' && (body.includes('# HELP') || body.includes('nodejs') || body.includes('http_')),
  },
  {
    name: 'v2 openapi',
    url: joinUrl(options.baseUrl, '/api/v2/openapi.json'),
    expect: (response) => response.status === 200,
    validate: (body) => Boolean(body && typeof body === 'object' && (body.openapi || body.info)),
  },
  {
    name: 'api preview cors preflight',
    url: joinUrl(options.baseUrl, '/api/v2/campaigns/summary'),
    init: {
      method: 'OPTIONS',
      headers: {
        Origin: options.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    },
    expect: (response) => response.status >= 200 && response.status < 300,
    validate: (_body, response) => response.headers.get('access-control-allow-origin') === options.origin,
  },
];

for (const path of unauthenticatedApiPaths) {
  checks.push({
    name: `api unauth ${path}`,
    url: joinUrl(options.baseUrl, path),
    expect: (response) => response.status === 401,
    validate: hasJsonErrorEnvelope,
  });
}

if (options.token) {
  for (const path of ['/api/v2/campaigns/summary', '/api/v2/integrations', '/api/v2/drafts', '/api/v2/billing', '/api/v2/settings/workspace']) {
    checks.push({
      name: `api authed ${path}`,
      url: joinUrl(options.baseUrl, path),
      init: { headers: { Authorization: `Bearer ${options.token}` } },
      expect: (response) => response.status >= 200 && response.status < 300,
    });
  }
}

if (options.webUrl) {
  for (const path of webRoutes) {
    checks.push({
      name: `web route ${path}`,
      url: joinUrl(options.webUrl, path),
      expect: (response) => response.status >= 200 && response.status < 500,
    });
  }

  checks.push({
    name: 'web rewrite v2 openapi',
    url: joinUrl(options.webUrl, '/api/v2/openapi.json'),
    expect: (response) => response.status === 200,
    validate: (body) => Boolean(body && typeof body === 'object' && (body.openapi || body.info)),
  });

  for (const path of ['/api/v2/campaigns/summary', '/api/v2/integrations']) {
    checks.push({
      name: `web rewrite unauth ${path}`,
      url: joinUrl(options.webUrl, path),
      expect: (response) => response.status === 401,
      validate: hasJsonErrorEnvelope,
    });
  }
}

console.log(`Running v1 smoke checks against API ${options.baseUrl}${options.webUrl ? ` and web ${options.webUrl}` : ''}`);
console.log(`Using preview origin ${options.origin}`);
const results = [];
for (const item of checks) {
  const result = await check(item);
  results.push(result);
  const marker = result.ok ? 'PASS' : 'FAIL';
  console.log(`${marker} ${result.name} ${result.status ? `(${result.status})` : ''} ${result.url}${result.error ? ` — ${result.error}` : ''}`);
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nAll v1 smoke checks passed.');
