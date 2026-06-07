const baseUrl = process.env.WIREMOCK_BASE_URL ?? 'http://localhost:9085';

const checks = [
  {
    name: 'health',
    path: '/health',
    method: 'GET',
    expect: 'adnexus-wiremock',
  },
  {
    name: 'meta campaigns',
    path: '/v19.0/act_1234567890/campaigns?access_token=mock-token',
    method: 'GET',
    expect: 'WireMock Meta Prospecting',
  },
  {
    name: 'google search',
    path: '/v16/customers/1234567890/googleAds:search',
    method: 'POST',
    body: { query: 'SELECT campaign.id FROM campaign' },
    expect: 'WireMock Google Search',
  },
  {
    name: 'tiktok campaigns',
    path: '/open_api/v1.3/campaign/get/?advertiser_id=tt_adv_123',
    method: 'GET',
    expect: 'WireMock TikTok Conversions',
  },
  {
    name: 'snap campaigns',
    path: '/v1/adaccounts/snap_adacct_123/campaigns',
    method: 'GET',
    expect: 'WireMock Snap Conversions',
  },
];

let failures = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCheck(check) {
  let lastError;

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${check.path}`, {
        method: check.method,
        headers: {
          Authorization: 'Bearer mock-token',
          'Access-Token': 'mock-token',
          'Content-Type': 'application/json',
          'developer-token': 'mock-google-dev-token',
        },
        body: check.body ? JSON.stringify(check.body) : undefined,
      });
      const body = await response.text();

      if (response.ok && body.includes(check.expect)) {
        return { ok: true };
      }

      lastError = `HTTP ${response.status} ${body.slice(0, 240)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(500);
  }

  return { ok: false, message: lastError };
}

for (const check of checks) {
  const result = await runCheck(check);

  if (result.ok) {
    console.log(`PASS ${check.name}`);
    continue;
  }

  failures += 1;
  console.error(`FAIL ${check.name}: ${result.message}`);
}

if (failures > 0) {
  process.exit(1);
}
