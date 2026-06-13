#!/usr/bin/env node
/**
 * SB-3220 full frontend QA — preview manual flows + screenshots + console capture.
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://adnexus-ai.apps.softblaze.net \
 *   PLAYWRIGHT_TEST_EMAIL=qa-owner@softblaze.net \
 *   PLAYWRIGHT_TEST_PASSWORD='AdNexus-QA-2026!' \
 *   node qa/sb-3220-frontend-qa.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://adnexus-ai.apps.softblaze.net';
const API = process.env.PLAYWRIGHT_API_BASE_URL ?? 'https://adnexus-api.apps.softblaze.net';
const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'qa-owner@softblaze.net';
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'AdNexus-QA-2026!';
const OUT = path.join(process.cwd(), 'qa/sb-3220-screenshots');

const ROUTES = [
  { id: 'dashboard', path: '/en/dashboard', label: 'Dashboard KPIs' },
  { id: 'reports', path: '/en/dashboard/reports', label: 'Reports' },
  { id: 'creatives', path: '/en/dashboard/creatives', label: 'Creative Explorer' },
  { id: 'mcp', path: '/en/dashboard/mcp', label: 'MCP Server' },
  { id: 'settings', path: '/en/dashboard/settings', label: 'Settings' },
  { id: 'ai-agent', path: '/en/dashboard/ai-agent', label: 'AI Agent' },
  { id: 'campaigns', path: '/en/dashboard/campaigns', label: 'Campaigns' },
  { id: 'integrations', path: '/en/dashboard/integrations', label: 'Integrations' },
  { id: 'analytics', path: '/en/dashboard/analytics', label: 'Analytics/Stats' },
];

const results = [];
const consoleErrors = [];

fs.mkdirSync(OUT, { recursive: true });

async function signIn(page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(`${BASE}/en/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    try {
      await page.waitForURL(/\/en\/(dashboard|onboarding)/, { timeout: 25_000 });
      const token = await page.evaluate(() => localStorage.getItem('adnexus_token'));
      if (token) return token;
    } catch {
      const alert = await page.locator('[role=alert]').first().textContent().catch(() => '');
      if (/rate limit/i.test(alert ?? '')) {
        const wait = 65_000 * (attempt + 1);
        console.log(`Rate limited — waiting ${wait / 1000}s (attempt ${attempt + 1})`);
        await page.waitForTimeout(wait);
        continue;
      }
    }
  }
  throw new Error('Sign-in failed after retries');
}

async function testRoute(page, route) {
  const entry = { feature: route.label, path: route.path, status: 'FAIL', notes: [] };
  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (page.url().includes('/auth/signin')) {
      entry.notes.push('Redirected to sign-in');
      results.push(entry);
      return;
    }
    await page.waitForTimeout(1500);
    const heading = page.getByRole('heading').first();
    const visible = await heading.isVisible().catch(() => false);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    // Avoid matching impression counts like "31,500" — only standalone HTTP status codes
    const hasError =
      /something went wrong|error loading|failed to load|(?<![\d,])50[03](?!\d)/i.test(bodyText);
    const empty = /no (data|campaigns|creatives|results)/i.test(bodyText);

    await page.screenshot({ path: path.join(OUT, `${route.id}.png`), fullPage: true });

    if (hasError) {
      entry.notes.push('Error state visible in UI');
    } else if (visible) {
      entry.status = empty ? 'PASS*' : 'PASS';
      if (empty) entry.notes.push('Page loaded but shows empty/no-data state');
    } else {
      entry.notes.push('No heading visible');
    }
  } catch (err) {
    entry.notes.push(err instanceof Error ? err.message : String(err));
  }
  results.push(entry);
}

async function testDraftFlow(page) {
  const entry = { feature: 'Create/Improve Ad flow', path: '/en/dashboard/campaigns', status: 'FAIL', notes: [] };
  try {
    await page.goto(`${BASE}/en/dashboard/campaigns`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const createMatcher = /\+?\s*new campaign|create campaign|create|draft/i;
    const createBtn = page
      .getByRole('link', { name: createMatcher })
      .or(page.getByRole('button', { name: createMatcher }))
      .first();
    const improveBtn = page.getByRole('button', { name: /improve|optimize|ai/i }).first();

    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').innerText();
      if (/DRAFT_EXECUTION_DISABLED|disabled|not available|coming soon/i.test(body)) {
        entry.status = 'BLOCKED';
        entry.notes.push('DRAFT_EXECUTION_DISABLED or feature gated');
      } else {
        entry.status = 'PASS';
        entry.notes.push('Create flow opened');
      }
    } else if (await improveBtn.isVisible().catch(() => false)) {
      entry.status = 'PASS*';
      entry.notes.push('Improve ad button visible; create not found');
    } else {
      entry.status = 'BLOCKED';
      entry.notes.push('No create/improve ad CTA found on campaigns page');
    }
    await page.screenshot({ path: path.join(OUT, 'draft-flow.png'), fullPage: true });
  } catch (err) {
    entry.notes.push(err instanceof Error ? err.message : String(err));
  }
  results.push(entry);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.message });
  });

  console.log('Signing in…');
  const token = await signIn(page);
  await page.screenshot({ path: path.join(OUT, '01-dashboard-after-signin.png'), fullPage: true });
  results.push({ feature: 'Sign-in → Dashboard', path: '/en/auth/signin', status: 'PASS', notes: ['JWT stored'] });

  // Try mock-traffic seed if harness key provided
  const harnessKey = process.env.MOCK_TRAFFIC_HARNESS_KEY ?? '';
  if (harnessKey) {
    const seedRes = await fetch(`${API}/api/v2/integrations/mock-traffic/seed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-mock-traffic-key': harnessKey,
      },
      body: '{}',
    });
    const seedJson = await seedRes.json().catch(() => ({}));
    results.push({
      feature: 'Mock-traffic seed',
      path: '/api/v2/integrations/mock-traffic/seed',
      status: seedRes.ok ? 'PASS' : 'FAIL',
      notes: [JSON.stringify(seedJson).slice(0, 200)],
    });
  } else {
    results.push({
      feature: 'Mock-traffic seed',
      path: '/api/v2/integrations/mock-traffic/seed',
      status: 'SKIP',
      notes: ['MOCK_TRAFFIC_HARNESS_KEY not set — using existing seeded data if any'],
    });
  }

  for (const route of ROUTES) {
    console.log(`Testing ${route.label}…`);
    await testRoute(page, route);
  }

  await testDraftFlow(page);

  const report = {
    timestamp: new Date().toISOString(),
    baseURL: BASE,
    apiURL: API,
    email: EMAIL,
    results,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 50),
    screenshotsDir: OUT,
  };

  fs.writeFileSync(path.join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== FEATURE MATRIX ===');
  for (const r of results) {
    console.log(`${r.status.padEnd(8)} ${r.feature} — ${r.notes.join('; ')}`);
  }
  console.log(`\nConsole errors: ${consoleErrors.length}`);
  console.log(`Report: ${path.join(OUT, 'qa-report.json')}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
