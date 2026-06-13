#!/usr/bin/env node
/**
 * Verify mock-traffic seed results against a running API.
 *
 * Usage:
 *   API_BASE=http://localhost:3001 \
 *   MOCK_TRAFFIC_HARNESS_KEY=qa-mock-traffic-2026-06-07 \
 *   QA_EMAIL=qa-owner@softblaze.net \
 *   QA_PASSWORD='AdNexus-QA-2026!' \
 *   node scripts/verify-mock-traffic-seed.mjs
 */

const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';
const HARNESS_KEY = process.env.MOCK_TRAFFIC_HARNESS_KEY ?? 'qa-mock-traffic-2026-06-07';
const QA_EMAIL = process.env.QA_EMAIL ?? 'qa-owner@softblaze.net';
const QA_PASSWORD = process.env.QA_PASSWORD ?? 'AdNexus-QA-2026!';

async function json(method, path, { token, body, headers = {} } = {}) {
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
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return data;
}

async function main() {
  console.log(`→ Sign in as ${QA_EMAIL}`);
  const signIn = await json('POST', '/api/v2/auth/signin', {
    body: { email: QA_EMAIL, password: QA_PASSWORD },
  });
  const token = signIn.token ?? signIn.data?.token;
  if (!token) throw new Error('No auth token in sign-in response');

  console.log('→ Seed mock traffic (all platforms)');
  const seed = await json('POST', '/api/v2/integrations/mock-traffic/seed', {
    token,
    headers: { 'x-mock-traffic-key': HARNESS_KEY },
    body: {},
  });
  const seeded = seed.data ?? seed;
  console.log('  seed counts:', {
    accounts: seeded.accountsSeeded,
    campaigns: seeded.campaignsSeeded,
    adSets: seeded.adSetsSeeded,
    ads: seeded.adsSeeded,
    platforms: seeded.platforms,
    campaignStatuses: seeded.campaignStatuses,
  });

  console.log('→ GET /api/v2/ads');
  const ads = await json('GET', '/api/v2/ads?limit=200', { token });
  const rows = ads.data?.ads ?? ads.data ?? [];
  const total = ads.data?.total ?? rows.length;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Expected ads > 0, got total=${total}`);
  }
  if (rows.length < 48) {
    throw new Error(`Expected at least 48 ads, got ${rows.length}`);
  }

  const creativeTexts = new Set(rows.map((a) => a.creative_text ?? a.creativeText).filter(Boolean));
  const creativeTypes = new Set(rows.map((a) => a.creative_type ?? a.creativeType).filter(Boolean));
  const fatigueStatuses = new Set(rows.map((a) => a.fatigue_status ?? a.fatigueStatus).filter(Boolean));
  const platforms = new Set(rows.map((a) => a.platform).filter(Boolean));

  if (creativeTexts.size < 12) {
    throw new Error(`Expected diverse creative copy (≥12 unique), got ${creativeTexts.size}`);
  }
  if (creativeTypes.size < 3) {
    throw new Error(`Expected ≥3 creative types, got: ${[...creativeTypes].join(', ')}`);
  }
  if (fatigueStatuses.size < 2) {
    throw new Error(`Expected fatigue variety, got: ${[...fatigueStatuses].join(', ')}`);
  }
  if (platforms.size < 4) {
    throw new Error(`Expected 4 platforms in ads, got: ${[...platforms].join(', ')}`);
  }

  const sampleAd = rows.find((a) => (a.creative_text ?? a.creativeText)?.includes('CTA:'));
  if (!sampleAd) {
    throw new Error('Expected at least one ad with CTA in creative_text');
  }

  console.log('→ GET /api/v2/campaigns');
  const campaigns = await json('GET', '/api/v2/campaigns?limit=100', { token });
  const campaignRows = campaigns.data?.campaigns ?? campaigns.data ?? [];
  const statuses = new Set(campaignRows.map((c) => c.status));
  if (!statuses.has('active') || !statuses.has('paused')) {
    throw new Error(`Expected active + paused campaigns, got: ${[...statuses].join(', ')}`);
  }

  console.log('PASS mock-traffic verification');
  console.log(JSON.stringify({
    adsListed: rows.length,
    adsTotal: total,
    uniqueCreativeTexts: creativeTexts.size,
    creativeTypes: [...creativeTypes],
    fatigueStatuses: [...fatigueStatuses],
    platforms: [...platforms],
    sampleCreative: (sampleAd.creative_text ?? sampleAd.creativeText)?.slice(0, 120),
    campaignStatusVariety: [...statuses],
    seeded,
  }, null, 2));
}

main().catch((err) => {
  console.error('FAIL', err.message);
  process.exit(1);
});
