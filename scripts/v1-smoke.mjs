#!/usr/bin/env node

import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const options = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  webUrl: process.env.WEB_URL || '',
  timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS || 8000),
  retries: Number(process.env.SMOKE_RETRIES || 1),
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
    i += 1;
  } else if (arg === '--timeout-ms') {
    options.timeoutMs = Number(readValue(args, i, arg));
    i += 1;
  } else if (arg === '--retries') {
    options.retries = Number(readValue(args, i, arg));
    i += 1;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: pnpm smoke:v1 -- --base-url <api-url> [--web-url <web-url>] [--timeout-ms 8000] [--retries 1]

Checks AdNexus launch readiness endpoints without credentials:
  - API /health
  - API /ready
  - API /metrics
  - API /api/v2/openapi.json
  - Optional web routes: /en, /en/auth/signup, /en/auth/signin, /en/dashboard

Environment alternatives: API_URL, WEB_URL, SMOKE_TIMEOUT_MS, SMOKE_RETRIES.`);
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/+$/, '')}${path}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
  }
}

async function check({ name, url, expect, validate }) {
  let lastError;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

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
];

if (options.webUrl) {
  for (const path of ['/en', '/en/auth/signup', '/en/auth/signin', '/en/dashboard']) {
    checks.push({
      name: `web ${path}`,
      url: joinUrl(options.webUrl, path),
      expect: (response) => response.status >= 200 && response.status < 500,
    });
  }
}

console.log(`Running v1 smoke checks against API ${options.baseUrl}${options.webUrl ? ` and web ${options.webUrl}` : ''}`);
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
